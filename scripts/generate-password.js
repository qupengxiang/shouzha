/**
 * 生成密码哈希的测试脚本
 */
const crypto = require('crypto');

const SALT = 'shouzha-salt-v1';
const SALT_BYTES = Buffer.from(SALT, 'utf8');

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

// 测试密码 'jianguo2026'
hashPassword('jianguo2026').then(hashed => {
  console.log('Password: jianguo2026');
  console.log('Hashed: ' + hashed);
  console.log('Hashed length: ' + hashed.length);
});
