'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Category {
  id: string; name: string; slug: string; sortOrder: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', sortOrder: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch('/api/admin/categories');
    if (res.ok) { const data = await res.json(); setCategories(data); }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim()) { setError('名称不能为空'); return; }
    if (!form.slug.trim()) { setError('别名不能为空'); return; }
    try {
      if (editing) {
        const res = await fetch(`/api/admin/categories/${editing.id}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || '更新失败'); return; }
        setSuccess('更新成功');
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || '创建失败'); return; }
        setSuccess('创建成功');
      }
      setForm({ name: '', slug: '', sortOrder: 0 });
      setShowForm(false); setEditing(null);
      fetchCategories();
    } catch { setError('网络错误'); }
  }

  function handleEdit(cat: Category) {
    setEditing(cat); setForm({ name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder });
    setShowForm(true); setError('');
  }

  function handleDelete(id: string) {
    if (!confirm('确定删除该分类？文章会保留但失去分类。')) return;
    fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => { if (data.error) alert(data.error); else fetchCategories(); });
  }

  function autoSlug(name: string) {
    setForm(f => ({ ...f, slug: name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-') }));
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-sm text-gray-400 hover:text-amber-600 transition-colors">← 后台</Link>
          <h1 className="font-serif text-xl font-semibold">📁 分类管理</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', slug: '', sortOrder: 0 }); setError(''); }}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          + 新增分类
        </button>
      </header>

      {showForm && (
        <div className="bg-paper-dark border border-border rounded-xl p-6 mb-6">
          <h2 className="font-serif text-base font-semibold mb-4">{editing ? '编辑分类' : '新增分类'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">名称</label>
                <input
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); autoSlug(e.target.value); }}
                  placeholder="例如：生活"
                  autoFocus
                  className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">别名（URL）</label>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="例如：life"
                  className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">排序</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  min={0}
                  className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:border-amber-600 transition-colors"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2">{success}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:border-amber-600 transition-colors">取消</button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                {editing ? '保存修改' : '确认创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-paper-dark border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-400">暂无分类，点击上方按钮添加</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-paper">
                <th className="text-left px-5 py-3 font-medium text-gray-500 w-20">排序</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">名称</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">别名</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-border last:border-b-0 hover:bg-paper transition-colors">
                  <td className="px-5 py-3.5 text-gray-400 font-mono">{cat.sortOrder}</td>
                  <td className="px-5 py-3.5 font-medium">{cat.name}</td>
                  <td className="px-5 py-3.5 text-gray-400 font-mono">{cat.slug}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleEdit(cat)} className="px-2.5 py-1 text-xs border border-border rounded hover:border-amber-600 hover:text-amber-600 transition-colors mr-2">编辑</button>
                    <button onClick={() => handleDelete(cat.id)} className="px-2.5 py-1 text-xs text-red-400 border border-border rounded hover:border-red-400 hover:text-red-500 transition-colors">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
