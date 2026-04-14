'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 新建用户表单
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user' });
  
  // 编辑用户
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', role: '', newPassword: '' });
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        if (res.status === 401) router.push('/admin');
      } else {
        setUsers(data.users);
      }
    } catch {
      setError('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }
  
  async function createUser() {
    if (!newUser.username || !newUser.password) {
      setError('用户名和密码不能为空');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setShowCreate(false);
        setNewUser({ username: '', password: '', email: '', role: 'user' });
        fetchUsers();
      }
    } catch {
      setError('创建用户失败');
    }
  }
  
  async function updateUser() {
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setEditingUser(null);
        setEditForm({ email: '', role: '', newPassword: '' });
        fetchUsers();
      }
    } catch {
      setError('更新用户失败');
    }
  }
  
  async function deleteUser(userId: number, username: string) {
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        fetchUsers();
      }
    } catch {
      setError('删除用户失败');
    }
  }
  
  function startEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      email: user.email || '',
      role: user.role,
      newPassword: '',
    });
  }
  
  const roleLabels: Record<string, string> = {
    admin: '管理员',
    editor: '编辑',
    user: '普通用户',
  };
  
  if (loading) {
    return <div className="p-8 text-center">加载中...</div>;
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">账号管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + 新建账号
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      
      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">邮箱</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">角色</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">最后登录</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {roleLabels[user.role] || user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '从未登录'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => startEdit(user)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteUser(user.id, user.username)}
                    className="text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 新建用户弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">新建账号</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="用户名（字母数字下划线）"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                placeholder="密码（至少6位）"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="email"
                placeholder="邮箱（可选）"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="user">普通用户</option>
                <option value="editor">编辑</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 编辑用户弹窗 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">编辑账号：{editingUser.username}</h2>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="邮箱"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="user">普通用户</option>
                <option value="editor">编辑</option>
                <option value="admin">管理员</option>
              </select>
              <input
                type="password"
                placeholder="新密码（留空则不修改）"
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={updateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
