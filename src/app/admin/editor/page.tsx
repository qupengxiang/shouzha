'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Link as Link_ } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Image as TiptapImage } from '@tiptap/extension-image';
import DOMPurify from 'isomorphic-dompurify';
import ClientOnly from '@/components/ClientOnly';
import './editor.css';

interface Article {
  id: string; title: string; category: string; categorySlug: string;
  date: string; readTime: string; tags: string[]; excerpt: string;
  content: string; published: boolean;
}

interface AIMessage { role: 'user' | 'ai'; content: string; action?: string; }
interface Category { slug: string; name: string; icon: string; }

const DEFAULT_CATEGORIES: Category[] = [
  { slug: 'life', name: '生活', icon: '🏠' },
  { slug: 'learn', name: '学习与工作', icon: '📚' },
  { slug: 'think', name: '思考与成长', icon: '💡' },
  { slug: 'knowledge', name: '知识积累', icon: '📦' },
];

const FONT_SIZES = [
  { label: '正文', value: '16px' },
  { label: '小', value: '14px' },
  { label: '大', value: '20px' },
  { label: '特大', value: '24px' },
  { label: '标题', value: '32px' },
];

const TEXT_COLORS = [
  { label: '默认', value: '#2d2a26' },
  { label: '琥珀', value: '#b45309' },
  { label: '玫瑰', value: '#be123c' },
  { label: '绿色', value: '#15803d' },
  { label: '蓝色', value: '#1d4ed8' },
  { label: '紫色', value: '#7c3aed' },
  { label: '灰色', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { label: '无', value: 'transparent' },
  { label: '琥珀', value: '#fef3c7' },
  { label: '绿', value: '#dcfce7' },
  { label: '蓝', value: '#dbeafe' },
  { label: '粉', value: '#fce7f3' },
  { label: '紫', value: '#ede9fe' },
];

const AI_ACTIONS = [
  {
    key: 'continue', label: '续写', icon: '✨', color: 'blue',
    prompt: (c: string) => `你是一位中文写作助手，帮助用户继续写作。\n\n用户当前文章内容：\n${c}\n\n请接着上文自然地续写下去，保持相同的文风、语气和叙事节奏。只输出续写内容，不需要任何解释或说明。`,
  },
  {
    key: 'polish', label: '润色', icon: '🎨', color: 'purple',
    prompt: (c: string) => `你是一位中文写作润色专家。\n\n原文：\n${c}\n\n请优化语言表达，使其更流畅、更地道、更有文学感。保持原文意思和风格。只输出润色后的内容。`,
  },
  {
    key: 'extend', label: '扩展', icon: '📝', color: 'green',
    prompt: (c: string, title?: string) => `你是一位中文写作助手。\n\n文章标题：${title || '无标题'}\n\n文章内容：\n${c}\n\n请围绕这个主题扩展相关的内容，可以补充新的论点、故事、案例或观点，让文章更丰富。只输出扩展内容。`,
  },
  {
    key: 'summarize', label: '摘要', icon: '📋', color: 'amber',
    prompt: (c: string) => `你是一位文章摘要专家。\n\n文章内容：\n${c}\n\n请生成一段简洁有力的摘要（50-100字），概括文章核心内容，用于列表页展示。只输出摘要文字。`,
  },
  {
    key: 'outline', label: '大纲', icon: '🗺', color: 'teal',
    prompt: (c: string) => `你是一位写作顾问。\n\n文章内容：\n${c}\n\n请分析这篇文章的结构，列出段落大纲（用 Markdown 格式）。只输出大纲。`,
  },
];

// ──────────────────────────────────────────────
// BubbleToolbar: appears when text is selected
// ──────────────────────────────────────────────
function BubbleToolbar({ editor }: { editor: Editor }) {
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (uploadingImage) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } else {
        alert(data.error || '上传失败');
      }
    } catch {
      alert('上传失败，请检查网络');
    } finally {
      setUploadingImage(false);
    }
  };

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  const activeFontSize = editor.getAttributes('textStyle').fontSize || '16px';
  const activeColor = editor.getAttributes('textStyle').color || '#2d2a26';
  const activeHighlight = editor.getAttributes('highlight').color || 'transparent';

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      setShowLinkInput(v => !v);
    }
  };

  const applyLink = () => {
    if (linkInput.trim()) {
      editor.chain().focus().setLink({ href: linkInput }).run();
    }
    setShowLinkInput(false);
    setLinkInput('');
  };

  const colorBtnClass = (isActive: boolean) =>
    `w-6 h-6 rounded border-2 cursor-pointer transition-transform hover:scale-110 ${isActive ? 'border-gray-800 ring-1 ring-gray-400' : 'border-gray-300'}`;

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-xl shadow-xl border border-gray-200 px-2 py-1.5 z-50"
      style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Headings */}
      {[1,2,3].map(n => (
        <button key={n}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: n as 1|2|3 }).run(); }}
          className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: n }) ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
          }`}>
          H{n}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Basic formatting */}
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold transition-colors ${editor.isActive('bold') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        B
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm italic transition-colors ${editor.isActive('italic') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        I
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm underline-offset-4 transition-colors ${editor.isActive('underline') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}
        style={{ textDecoration: 'underline' }}>
        U
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm line-through transition-colors ${editor.isActive('strike') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        S
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Lists */}
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('bulletList') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        •
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('orderedList') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        1.
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${editor.isActive('blockquote') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        ❝
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('codeBlock') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        {'</>'}
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Align */}
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        ≡
      </button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        ≣
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Font Size dropdown */}
      <div className="relative">
        <button onMouseDown={e => { e.preventDefault(); setShowFontSize(v => !v); setShowColor(false); setShowHighlight(false); }}
          className="flex items-center gap-1 px-2 h-8 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap">
          {FONT_SIZES.find(s => s.value === activeFontSize)?.label || '正文'}
          <span className="text-[10px] opacity-50">▼</span>
        </button>
        {showFontSize && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-[100] min-w-[100px]">
            {FONT_SIZES.map(s => (
              <button key={s.value}
                onMouseDown={e => {
                  e.preventDefault();
                  editor.chain().focus().setFontSize(s.value).run();
                  setShowFontSize(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span>{s.label}</span>
                <span className="text-gray-400 text-[10px]">{s.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text Color */}
      <div className="relative">
        <button onMouseDown={e => { e.preventDefault(); setShowColor(v => !v); setShowFontSize(false); setShowHighlight(false); }}
          className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100">
          <span className="text-sm" style={{ color: activeColor, fontWeight: '700' }}>A</span>
        </button>
        {showColor && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-[100]">
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map(c => (
                <button key={c.value}
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c.value).run(); setShowColor(false); }}
                  title={c.label}>
                  <div className={colorBtnClass(activeColor === c.value)}
                    style={{ backgroundColor: c.value }} />
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input type="color"
                defaultValue={activeColor}
                onChange={e => editor.chain().focus().setColor(e.target.value).run()}
                className="w-full h-7 rounded cursor-pointer border border-gray-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button onMouseDown={e => { e.preventDefault(); setShowHighlight(v => !v); setShowFontSize(false); setShowColor(false); }}
          className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100">
          <span className="text-sm">🖌</span>
        </button>
        {showHighlight && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-[100]">
            <div className="grid grid-cols-6 gap-1.5">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.value}
                  onMouseDown={e => {
                    e.preventDefault();
                    if (c.value === 'transparent') {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().setHighlight({ color: c.value }).run();
                    }
                    setShowHighlight(false);
                  }}
                  title={c.label}>
                  <div className={colorBtnClass(activeHighlight === c.value)}
                    style={{ backgroundColor: c.value === 'transparent' ? '#fff' : c.value,
                      border: c.value === 'transparent' ? '1px dashed #ccc' : `1px solid ${c.value}40` }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Link */}
      <button onMouseDown={e => { e.preventDefault(); toggleLink(); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('link') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
        🔗
      </button>

      {/* Link input */}
      {showLinkInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="url"
            placeholder="输入链接..."
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') { setShowLinkInput(false); setLinkInput(''); } }}
            className="px-2 py-1 text-xs border border-gray-300 rounded-lg w-36 focus:outline-none focus:border-amber-600"
            autoFocus
          />
          <button onMouseDown={applyLink}
            className="px-2 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">✓</button>
          {editor.isActive('link') && (
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">✕</button>
          )}
        </div>
      )}

      {/* Image upload */}
      <div className="relative">
        <button
          onMouseDown={e => { e.preventDefault(); imageInputRef.current?.click(); }}
          className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${uploadingImage ? 'text-amber-400 animate-pulse' : 'text-gray-600 hover:bg-gray-100'}`}
          title="插入图片"
          disabled={uploadingImage}>
          {uploadingImage ? '↻' : '🖼'}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={onImageFileChange}
        />
      </div>

      {/* Remove format */}
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().clearNodes().run(); }}
        className="w-8 h-8 flex items-center justify-center rounded text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="清除格式">
        ⟲
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// Image upload helper (module-level, shares editor ref)
// ──────────────────────────────────────────────
let _editorRef: Editor | null = null;
function setEditorInstance(e: Editor) { _editorRef = e; }

async function uploadImageToEditor(file: File) {
  if (!_editorRef) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      _editorRef.chain().focus().setImage({ src: data.url, alt: file.name }).run();
    } else {
      alert(data.error || '图片上传失败');
    }
  } catch {
    alert('图片上传失败，请检查网络');
  }
}

// ──────────────────────────────────────────────
// Main editor page
// ──────────────────────────────────────────────
export default function EditorPage() {
  return (
    <ClientOnly fallback={<div className="flex items-center justify-center h-screen"><span className="text-gray-400">加载中...</span></div>}>
      <EditorPageContent />
    </ClientOnly>
  );
}

function EditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [article, setArticle] = useState<Partial<Article>>({
    title: '', category: '生活', categorySlug: 'life',
    date: new Date().toISOString().split('T')[0], readTime: '5 分钟',
    tags: [], excerpt: '', content: '', published: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{text:string;type:'success'|'error'}|null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [editorReady, setEditorReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TipTap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      Link_.configure({ openOnClick: false }),
      Underline,
      TiptapImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: '从这里开始写作...' }),
    ],
    immediatelyRender: false,
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-content focus:outline-none min-h-[500px] px-0',
        spellcheck: 'false',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer) {
          const files = event.dataTransfer.files;
          if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              uploadImageToEditor(file);
              return true;
            }
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) uploadImageToEditor(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      setArticle(prev => ({ ...prev, content: html }));
      // Word count from text
      const text = e.getText();
      const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const en = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(Boolean).join(' ').length;
      const total = cn + en;
      setWordCount(total);
    },
  }, []);

  // Share editor instance for image upload from handleDrop/handlePaste
  useEffect(() => {
    if (editor) {
      setEditorInstance(editor);
      return () => { _editorRef = null; };
    }
  }, [editor]);

  // Auth check
  useEffect(() => {
    fetch('/api/admin/check').then(res => {
      if (!res.ok) { router.push('/admin'); return; }
      if (editId) {
        fetch('/api/admin/articles/' + editId).then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.article) {
              setArticle(data.article);
              // Set editor content when editor is ready
              const checkAndSet = () => {
                if (editor && data.article.content) {
                  editor.commands.setContent(DOMPurify.sanitize(data.article.content || '', { USE_PROFILES: { html: true } }));
                  setEditorReady(true);
                  const text = editor.getText();
                  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
                  const en = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(Boolean).join(' ').length;
                  setWordCount(cn + en);
                }
              };
              if (editor) checkAndSet();
              else {
                const timer = setInterval(checkAndSet, 100);
                setTimeout(() => clearInterval(timer), 5000);
              }
            }
          });
      } else {
        setEditorReady(true);
      }
    }).catch(() => router.push('/admin'));
  }, [editId, router, editor]);

  // Load categories
  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.length > 0) setCategories(data.map((c: any) => ({ slug: c.slug, name: c.name, icon: '📁' })));
      });
  }, []);

  // Auto-scroll AI messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const showToast = useCallback((text: string, type: 'success'|'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const saveArticle = async (publish?: boolean) => {
    setSaving(true);
    try {
      const html = editor?.getHTML() || '';
      const payload = { ...article, content: html };
      if (publish !== undefined) payload.published = publish;
      const res = editId
        ? await fetch(`/api/admin/articles/${editId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        : await fetch('/api/admin/articles', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (res.ok) {
        const data = await res.json();
        if (!editId) router.replace(`/admin/editor?id=${data.article.id}`);
        setArticle(data.article);
        showToast(publish !== undefined ? (publish ? '已发布 ✨' : '已设为草稿') : '已保存 💾');
      } else { showToast('保存失败', 'error'); }
    } catch { showToast('网络错误', 'error'); }
    finally { setSaving(false); }
  };

  const addTag = (tag: string) => {
    const clean = tag.trim().replace(/,|，/g, '');
    if (clean && !article.tags?.includes(clean)) setArticle(prev => ({ ...prev, tags: [...(prev.tags || []), clean] }));
    setTagInput('');
  };
  const removeTag = (tag: string) => setArticle(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));

  const callAI = async (prompt: string, actionLabel: string) => {
    setAiLoading(true);
    setAiMessages(prev => [...prev, { role: 'user', content: prompt, action: actionLabel }]);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: '你是一位专业的中文写作助手，名为"建国助手"。你的回答简洁、有深度、富有文采。回复只包含内容，不包含任何解释或前缀。' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: 'ai', content: data.content || 'AI 暂时无法回应，请稍后重试。' }]);
    } catch {
      setAiMessages(prev => [...prev, { role: 'ai', content: '网络错误，请检查连接后重试。' }]);
    } finally { setAiLoading(false); }
  };

  const aiAction = (key: string) => {
    const action = AI_ACTIONS.find(a => a.key === key);
    if (!action) return;
    const text = editor?.getText() || '';
    if (!text.trim()) { showToast('请先输入一些内容', 'error'); return; }
    const prompt = action.key === 'extend'
      ? action.prompt(text, article.title || '无标题')
      : action.prompt(text);
    callAI(prompt, action.label);
    if (!aiPanelOpen) setAiPanelOpen(true);
  };

  const aiCustom = () => {
    if (!aiPrompt.trim()) return;
    const text = editor?.getText() || '';
    const prompt = `用户当前文章：\n标题：${article.title}\n内容：\n${text}\n\n---\n用户指令：${aiPrompt}`;
    callAI(prompt, '自定义');
    setAiPrompt('');
    if (!aiPanelOpen) setAiPanelOpen(true);
  };

  const insertToEnd = (text: string) => {
    if (editor) {
      editor.chain().focus().insertContent(`<p>${text}</p>`).run();
    }
    showToast('已插入文章 ✨');
  };

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveArticle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [article, editor]);

  const aiBtnClass = (color: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
      teal: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
    };
    return map[color] || 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
  };

  if (!editor) return (
    <div className="h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">加载编辑器...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-paper">

      {/* ── Left sidebar ── */}
      {!immersiveMode && (
        <aside className="w-56 bg-paper-dark border-r border-border flex flex-col shrink-0">
          <div className="flex items-center gap-2 px-4 py-5 text-base font-semibold text-text border-b border-border">
            <span>📝</span><span>手札</span>
          </div>
          <nav className="flex flex-col gap-1 px-3 py-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-paper hover:text-text transition-colors">
              📄 文章管理
            </Link>
            <Link href="/admin/editor" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-amber-50 text-amber-700 font-medium">
              ✏️ 写文章
            </Link>
          </nav>
          <div className="mt-auto px-4 py-4 space-y-3">
            <Link href="/" target="_blank" className="text-xs text-gray-400 hover:text-amber-600 transition-colors flex items-center gap-1">
              ↗ 访问前台
            </Link>
            <button onClick={() => setImmersiveMode(true)} className="text-xs text-gray-400 hover:text-amber-600 transition-colors flex items-center gap-1 w-full text-left">
              🎯 沉浸模式
            </button>
          </div>
        </aside>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className={`flex items-center justify-between px-5 py-3 border-b border-border bg-white shrink-0 ${immersiveMode ? 'bg-white/80 backdrop-blur-sm' : ''}`}>
          <div className="flex items-center gap-4">
            {immersiveMode ? (
              <button onClick={() => setImmersiveMode(false)} className="text-xs text-gray-400 hover:text-amber-600 transition-colors">← 退出沉浸</button>
            ) : (
              <Link href="/admin/dashboard" className="text-sm text-gray-400 hover:text-amber-600 transition-colors">← 返回</Link>
            )}
            <span className="font-semibold text-sm text-text">{editId ? '✏️ 编辑文章' : '🆕 新建文章'}</span>
            {article.published && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">已发布</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-2">{wordCount} 字</span>
            <button onClick={() => saveArticle()} disabled={saving}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors disabled:opacity-50">
              {saving ? '保存中...' : '💾 保存'}
            </button>
            <button onClick={() => saveArticle(!article.published)} disabled={saving || !article.title}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                article.published ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}>
              {article.published ? '✓ 已发布' : '🚀 发布'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-y-auto">

            {/* Meta */}
            <div className={`px-8 pt-8 space-y-4 max-w-4xl mx-auto w-full ${immersiveMode ? 'pb-2' : 'pb-4'}`}>
              <input
                type="text"
                placeholder="文章标题..."
                value={article.title}
                onChange={e => setArticle(prev => ({...prev, title: e.target.value}))}
                className="w-full bg-transparent border-none outline-none placeholder-gray-300 text-text resize-none"
                style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: '700', lineHeight: '1.3' }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <select value={article.categorySlug}
                  onChange={e => {
                    const cat = categories.find(c => c.slug === e.target.value);
                    setArticle(prev => ({...prev, categorySlug: e.target.value, category: cat?.name || ''}));
                  }}
                  className="text-sm bg-white border border-border rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:border-amber-600 cursor-pointer">
                  {categories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <input type="date" value={article.date}
                  onChange={e => setArticle(prev => ({...prev, date: e.target.value}))}
                  className="text-sm bg-white border border-border rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:border-amber-600" />
                <div className="flex flex-wrap gap-1.5 items-center">
                  {article.tags?.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                      {tag}<button onClick={() => removeTag(tag)} className="hover:text-amber-900 font-bold ml-0.5">×</button>
                    </span>
                  ))}
                  <input placeholder="+ 标签" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                    className="w-20 text-xs bg-transparent outline-none placeholder-gray-300" />
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="简短摘要，用于列表页展示..."
                value={article.excerpt}
                onChange={e => setArticle(prev => ({...prev, excerpt: e.target.value}))}
                className="w-full text-sm bg-white border border-border rounded-lg px-4 py-3 text-gray-600 leading-relaxed focus:outline-none focus:border-amber-600 resize-none"
              />
              <div className="border-t border-border/60" />
            </div>

            {/* AI toolbar */}
            {!immersiveMode && (
              <div className="px-8 max-w-4xl mx-auto w-full mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 mr-1">AI 辅助：</span>
                  {AI_ACTIONS.map(action => (
                    <button key={action.key}
                      onClick={() => aiAction(action.key)}
                      disabled={aiLoading}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-colors disabled:opacity-40 hover:scale-105 ${aiBtnClass(action.color)}`}>
                      {action.icon} {action.label}
                    </button>
                  ))}
                  <button onClick={() => setAiPanelOpen(v => !v)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors">
                    💬 {aiPanelOpen ? '隐藏' : '展开'} AI
                  </button>
                  <span className="text-xs text-gray-300 ml-2">⌘S 保存</span>
                </div>
              </div>
            )}

            {/* TipTap editor */}
            <div className={`px-8 pb-16 max-w-4xl mx-auto w-full ${immersiveMode ? 'max-w-3xl' : ''}`}>
              {/* Fixed toolbar */}
              <div className="flex items-center gap-0.5 bg-white rounded-xl border border-border px-2 py-1.5 mb-4 flex-wrap">
                {[1,2,3].map(n => (
                  <button key={n}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: n as 1|2|3 }).run(); }}
                    className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                      editor.isActive('heading', { level: n }) ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}>H{n}</button>
                ))}
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold transition-colors ${editor.isActive('bold') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>B</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm italic transition-colors ${editor.isActive('italic') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>I</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm underline transition-colors ${editor.isActive('underline') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>U</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm line-through transition-colors ${editor.isActive('strike') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>S</button>
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('bulletList') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>•</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('orderedList') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>1.</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${editor.isActive('blockquote') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>❝</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive('codeBlock') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>{'</>'}</button>
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive({textAlign:'left'})?'bg-amber-100 text-amber-700':'text-gray-600 hover:bg-gray-100'}`}>≡</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${editor.isActive({textAlign:'center'})?'bg-amber-100 text-amber-700':'text-gray-600 hover:bg-gray-100'}`}>≣</button>
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().clearNodes().run(); }}
                  className="w-8 h-8 flex items-center justify-center rounded text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="清除格式">⟲</button>
              </div>

              {/* Bubble toolbar (shows on text selection) */}
              <ClientOnly>
                {editor && (
                  <BubbleMenu editor={editor}>
                    <BubbleToolbar editor={editor} />
                  </BubbleMenu>
                )}
                {/* Editor area — wrapped in ClientOnly to prevent React SSR <script> warning */}
                <EditorContent editor={editor} className="tiptap-wrapper" />
              </ClientOnly>
            </div>
          </div>

          {/* ── AI Panel ── */}
          {aiPanelOpen && (
            <aside className="w-80 border-l border-border flex flex-col shrink-0 bg-paper-dark">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <h3 className="text-sm font-semibold text-text">建国助手</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${aiLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
                  <span className="text-xs text-gray-400">{aiLoading ? '思考中' : '就绪'}</span>
                </div>
              </div>

              <div className="px-4 py-3 border-b border-border/60 bg-white/50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-medium">快捷指令</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {AI_ACTIONS.map(action => (
                    <button key={action.key}
                      onClick={() => aiAction(action.key)}
                      disabled={aiLoading}
                      className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors disabled:opacity-40 flex flex-col items-start gap-0.5 ${aiBtnClass(action.color)}`}>
                      <span className="text-sm leading-none">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {aiMessages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-3">✨</p>
                    <p className="text-xs text-gray-400 mb-1">随时开始</p>
                    <p className="text-xs text-gray-300">选中文字后点击上方按钮，<br/>或直接描述你的写作需求</p>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block max-w-[92%] text-left rounded-xl px-3 py-2.5 ${
                      msg.role === 'user' ? 'bg-amber-100 text-amber-900 rounded-br-sm' : 'bg-white border border-border text-gray-700 rounded-bl-sm shadow-sm'
                    }`}>
                      <p className="text-[10px] opacity-50 mb-1.5 font-medium">
                        {msg.role === 'user' ? `你 · ${msg.action || ''}` : '建国助手 ✨'}
                      </p>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === 'ai' && (
                        <div className="flex gap-3 mt-2 pt-2 border-t border-border/50">
                          <button onClick={() => insertToEnd(msg.content)}
                            className="text-[10px] text-amber-600 hover:text-amber-800 font-medium">+ 插入文章</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="text-left">
                    <div className="inline-block bg-white border border-border rounded-xl rounded-bl-sm px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] opacity-50 mb-2 font-medium">建国助手 ✨</p>
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-border bg-white shrink-0">
                <textarea
                  rows={2}
                  placeholder="问 AI 任何问题，或描述你的写作需求..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); aiCustom(); } }}
                  className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-xs focus:outline-none focus:border-amber-600 resize-none placeholder-gray-300"
                />
                <button onClick={aiCustom} disabled={aiLoading || !aiPrompt.trim()}
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 font-medium">
                  ▶ 发送 · ⌘ Enter
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-text text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
