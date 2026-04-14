/**
 * 更新管理员密码的脚本
 */
const crypto = require('crypto');

const SALT = 'shouzha-salt-v1';
const SALT_BYTES = Buffer.from(SALT, 'utf8');

// Cloudflare D1 配置
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'e58caa7334ca1c169afbdfc72a0129ed';
const DATABASE_ID = process.env.D1_DATABASE_ID || '908684be-d74b-48b5-b49b-50948d121a08';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

async function hashPassword(password) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    Buffer.from(password, 'utf8'),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: SALT_BYTES,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    64 * 8 // 64 bytes = 512 bits
  );
  const hashArray = Array.from(new Uint8Array(bits));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function d1Exec(sql, params = []) {
  let i = 0;
  const d1Sql = sql.replace(/\?/g, () => `$${++i}`);
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: d1Sql, params }),
    }
  );
  const result = await response.json();
  console.log('SQL executed:', sql, params);
  console.log('Result:', result);
  return result;
}

async function updateAdminPassword() {
  try {
    const password = 'jianguo2026';
    const hashedPassword = await hashPassword(password);
    console.log('Updating admin password...');
    console.log('New password hash:', hashedPassword);
    
    await d1Exec(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    console.log('Admin password updated successfully!');
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
}

updateAdminPassword();
