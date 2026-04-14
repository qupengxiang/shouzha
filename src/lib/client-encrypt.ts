// 客户端密码加密工具
// 使用简单但安全的加密方式，结合时间戳防止重放攻击

export async function encryptPassword(password: string): Promise<string> {
  // 使用当前时间戳作为随机因子，防止重放攻击
  const timestamp = Date.now();
  const salt = `shouzha-login-${timestamp}`;
  
  // 组合密码和盐值
  const data = `${password}:${salt}`;
  
  // 使用Web Crypto API进行哈希
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // 返回加密后的密码和时间戳
  return `${hashHex}:${timestamp}`;
}

export async function verifyEncryptedPassword(encrypted: string, originalPassword: string): Promise<boolean> {
  const [hashHex, timestampStr] = encrypted.split(':');
  if (!hashHex || !timestampStr) return false;
  
  const timestamp = parseInt(timestampStr);
  if (isNaN(timestamp)) return false;
  
  // 检查时间戳是否在合理范围内（5分钟内）
  const now = Date.now();
  if (now - timestamp > 5 * 60 * 1000) {
    return false;
  }
  
  // 重新计算哈希进行验证
  const salt = `shouzha-login-${timestamp}`;
  const data = `${originalPassword}:${salt}`;
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return computedHash === hashHex;
}
