'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 密码混淆函数，防止在控制台直接看到明文
function obfuscatePassword(password: string): string {
  // 使用时间戳和随机字符串作为盐值
  const timestamp = Date.now();
  const randomSalt = Math.random().toString(36).substring(2, 15);
  const salt = `shouzha-${timestamp}-${randomSalt}`;
  
  // 双重XOR加密
  let result = '';
  for (let i = 0; i < password.length; i++) {
    // 第一层XOR
    let charCode = password.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
    // 第二层XOR（使用固定偏移）
    charCode ^= 0x55;
    result += String.fromCharCode(charCode);
  }
  
  // 添加校验和
  let checksum = 0;
  for (let i = 0; i < password.length; i++) {
    checksum += password.charCodeAt(i);
  }
  
  // 返回混淆后的密码、时间戳、随机盐值和校验和
  return btoa(`${result}:${timestamp}:${randomSalt}:${checksum}`);
}

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      // 获取CSRF令牌
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];
      
      // 混淆密码，防止在控制台直接看到明文
      const obfuscatedPassword = obfuscatePassword(password);
      
      // 构建请求头
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // 如果有CSRF令牌，添加到请求头
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, password: obfuscatedPassword, isObfuscated: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || '登录失败，请重试');
        setLoading(false);
      }
    } catch (err) {
      setError('网络错误，请重试');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm bg-paper-dark border border-border rounded-xl p-10 shadow-md">
        <div className="text-center mb-8">
          <span className="text-4xl block mb-4">📝</span>
          <h1 className="font-serif text-xl font-semibold mb-1">手札 · 后台</h1>
          <p className="text-sm text-gray-400">登录管理你的内容</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text mb-1.5">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-2.5 bg-paper border border-border rounded-lg text-sm text-text placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-100 transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1.5">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-paper border border-border rounded-lg text-sm text-text placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-100 transition-colors disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? '登录中...' : '进入后台 →'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400 leading-5">
          <span>默认账号：admin / jianguo2026</span>
          <br />
          <small>登录后请及时修改密码</small>
        </div>
      </div>
    </div>
  );
}
