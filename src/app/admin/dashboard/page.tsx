'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Article {
  id: string; title: string; category: string; date: string; published: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [user, setUser] = useState<{id:number;username:string;role:string}|null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({currentPassword:'', newPassword:'', confirmPassword:''});
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/check', { credentials: 'include' }),
      fetch('/api/admin/articles', { credentials: 'include' })
    ])
      .then(async ([authRes, articlesRes]) => {
        if (!authRes.ok) { router.push('/admin'); return; }
        const authData = await authRes.json();
        setUser(authData.user);
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticles(data.articles || []);
        }
        setLoading(false);
      })
      .catch(() => router.push('/admin'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setArticles(articles.filter(a => a.id !== id));
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ published: !published }), credentials: 'include'
    });
    if (res.ok) setArticles(articles.map(a => a.id === id ? {...a, published: !published} : a));
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 篇文章吗？`)) return;
    await Promise.all(Array.from(selectedIds).map(id =>
      fetch(`/api/admin/articles/${id}`, { method: 'DELETE', credentials: 'include' })
    ));
    setArticles(articles.filter(a => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(''); setPasswordSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('两次输入的新密码不一致'); return; }
    if (passwordForm.newPassword.length < 6) { setPasswordError('新密码至少需要6位'); return; }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess('密码修改成功！');
        setPasswordForm({currentPassword:'', newPassword:'', confirmPassword:''});
        setTimeout(() => setShowPasswordModal(false), 1500);
      } else { setPasswordError(data.error || '修改失败'); }
    } catch { setPasswordError('网络错误，请重试'); }
    finally { setChangingPassword(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-text">📝 手札后台</h1>
          {user && <span className="text-sm text-gray-400">@{user.username} ({user.role})</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="px-3 py-1.5 text-sm border border-border rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors">查看网站</Link>
          <Link href="/admin/editor" className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">+ 新建文章</Link>
          <Link href="/admin/categories" className="px-3 py-1.5 text-sm border border-border rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors">📁 分类</Link>
          <Link href="/admin/mini-programs" className="px-3 py-1.5 text-sm border border-border rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors">🛠️ 造物</Link>
          {user?.role === 'admin' && (
            <Link href="/admin/users" className="px-3 py-1.5 text-sm border border-border rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors">👥 账号</Link>
          )}
          <button onClick={() => setShowPasswordModal(true)} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:border-amber-600 hover:text-amber-600 transition-colors">修改密码</button>
          <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-red-400 border border-border rounded-lg hover:border-red-400 hover:text-red-500 transition-colors">退出</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-semibold">文章管理</h2>
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} className="px-4 py-2 text-sm bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-4">还没有文章</p>
            <Link href="/admin/editor" className="px-5 py-2.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-block">写第一篇</Link>
          </div>
        ) : (
          <div className="bg-paper-dark border border-border rounded-xl overflow-hidden">
            {articles.map(article => (
              <div key={article.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-paper transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.has(article.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    e.target.checked ? newSet.add(article.id) : newSet.delete(article.id);
                    setSelectedIds(newSet);
                  }}
                  className="w-4 h-4 rounded accent-amber-600"
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/editor?id=${article.id}`} className="block font-medium text-text hover:text-amber-600 transition-colors truncate">
                    {article.title || '(无标题)'}
                  </Link>
                  <span className="text-xs text-gray-400">{article.category} · {article.date}</span>
                </div>
                <span className={`px-2.5 py-0.5 text-xs rounded-full shrink-0 ${article.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {article.published ? '已发布' : '草稿'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleTogglePublish(article.id, article.published)} className="px-2.5 py-1 text-xs border border-border rounded hover:border-amber-600 hover:text-amber-600 transition-colors">
                    {article.published ? '下架' : '发布'}
                  </button>
                  <Link href={`/post/${article.id}`} target="_blank" className="px-2.5 py-1 text-xs border border-border rounded hover:border-amber-600 hover:text-amber-600 transition-colors">预览</Link>
                  <button onClick={() => handleDelete(article.id)} className="px-2.5 py-1 text-xs text-red-400 border border-border rounded hover:border-red-400 hover:text-red-500 transition-colors">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-paper rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-semibold mb-5">修改密码</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{passwordError}</div>}
              {passwordSuccess && <div className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">{passwordSuccess}</div>}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">当前密码</label>
                <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required
                  className="w-full px-4 py-2.5 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">新密码</label>
                <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required minLength={6}
                  className="w-full px-4 py-2.5 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">确认新密码</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required minLength={6}
                  className="w-full px-4 py-2.5 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg hover:border-amber-600 transition-colors">取消</button>
                <button type="submit" disabled={changingPassword} className="flex-1 px-4 py-2.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors">
                  {changingPassword ? '修改中...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
