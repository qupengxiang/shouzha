'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MiniProgram {
  id: string; title: string; description: string; coverImage: string;
  openLink: string; published: boolean; sortOrder: number; createdAt: string;
}

export default function MiniProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<MiniProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', coverImage: '', openLink: '', published: true, sortOrder: 0 });

  useEffect(() => { fetchPrograms(); }, []);

  async function fetchPrograms() {
    const res = await fetch('/api/admin/mini-programs');
    if (res.status === 401) { router.push('/admin'); return; }
    const data = await res.json();
    setPrograms(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/admin/mini-programs/${editingId}` : '/api/admin/mini-programs';
    const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
    if (res.ok) {
      setShowForm(false); setEditingId(null);
      setForm({ title: '', description: '', coverImage: '', openLink: '', published: true, sortOrder: 0 });
      fetchPrograms();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个小程序作品？')) return;
    await fetch(`/api/admin/mini-programs/${id}`, { method: 'DELETE' });
    fetchPrograms();
  }

  function startEdit(p: MiniProgram) {
    setEditingId(p.id);
    setForm({ title: p.title, description: p.description, coverImage: p.coverImage, openLink: p.openLink, published: p.published, sortOrder: p.sortOrder });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ title: '', description: '', coverImage: '', openLink: '', published: true, sortOrder: 0 });
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <a href="/admin/dashboard" className="text-sm text-gray-400 hover:text-amber-600 transition-colors">← 后台</a>
          <h1 className="font-serif text-xl font-semibold">🛠️ 造物管理</h1>
        </div>
        <button onClick={startCreate} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">+ 添加小程序</button>
      </header>

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : programs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">还没有小程序作品</p>
          <button onClick={startCreate} className="px-5 py-2.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">添加第一个</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programs.map(p => (
            <div key={p.id} className="bg-paper-dark border border-border rounded-xl overflow-hidden">
              {p.coverImage && <img src={p.coverImage} alt={p.title} className="w-full h-32 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ml-2 ${p.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.published ? '已发布' : '草稿'}</span>
                </div>
                {p.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{p.description}</p>}
                <p className="text-xs text-gray-400 mb-3 truncate">链接: <a href={p.openLink} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">{p.openLink}</a></p>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(p)} className="px-3 py-1.5 text-xs border border-border rounded hover:border-amber-600 hover:text-amber-600 transition-colors">编辑</button>
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-xs text-red-400 border border-border rounded hover:border-red-400 hover:text-red-500 transition-colors">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowForm(false)}>
          <div className="bg-paper rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-semibold mb-5">{editingId ? '编辑小程序' : '添加小程序'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">标题 *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="小程序名称" required
                  className="w-full px-4 py-2.5 bg-paper-dark border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">简介</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="一句话描述"
                  rows={2} className="w-full px-4 py-2.5 bg-paper-dark border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">封面图 URL</label>
                <input type="url" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-paper-dark border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">打开链接 *</label>
                <input type="url" value={form.openLink} onChange={e => setForm({...form, openLink: e.target.value})} placeholder="微信小程序链接" required
                  className="w-full px-4 py-2.5 bg-paper-dark border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">排序</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value)||0})} min={0}
                    className="w-24 px-3 py-2 bg-paper-dark border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="pub" checked={form.published} onChange={e => setForm({...form, published: e.target.checked})}
                    className="w-4 h-4 rounded accent-amber-600" />
                  <label htmlFor="pub" className="text-sm text-text">发布</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg hover:border-amber-600 transition-colors">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
