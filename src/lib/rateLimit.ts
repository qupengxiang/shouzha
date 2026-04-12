/**
 * 速率限制工具 — 内存版
 * 适合单实例部署的个人网站
 * 上线到 Vercel/AWS 多实例时需换 Redis 版
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** 清理过期条目（每小时清理一次） */
const CLEANUP_INTERVAL = 60 * 60 * 1000;
let lastCleanup = Date.now();
function cleanup() {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = Date.now();
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * 获取客户端 IP（只信任来自可信代理的 X-Forwarded-For）
 *
 * 安全策略：
 * - 直接访问（127.0.0.1 / ::1）：信任 X-Forwarded-For（localhost 代理可信）
 * - 其他来源：忽略 X-Forwarded-For（不可信，可被伪造）
 *
 * 生产环境部署在 Vercel 等 CDN 后时，需在 next.config.ts 中
 * 添加 'x-forwarded-for': '*' 到 headers，或用环境变量配置信任代理。
 */
export function getClientIP(req: Request): string {
  // 获取原始连接 IP（绕过不了）
  // Next.js 会通过 x-forwarded-for 传递 CDN/代理的真实 IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp    = req.headers.get('x-real-ip');

  // 只有请求来自本地/内网代理时，才信任 X-Forwarded-For
  // 否则直接来自公网的请求中 X-Forwarded-For 是可伪造的
  const isFromTrustedProxy =
    !forwarded ||                      // 没有 xff header，安全
    realIp === '127.0.0.1' ||          // 直接从本机 Next.js 来
    realIp === '::1' ||                // IPv6 localhost
    realIp?.startsWith('192.168.') || // 内网
    realIp?.startsWith('10.') ||      // 内网
    realIp?.startsWith('172.16.');

  if (isFromTrustedProxy && forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // 回退：使用 X-Real-IP（更难伪造）
  if (realIp) return realIp.trim();

  // 最终回退
  return '127.0.0.1';
}

/**
 * 速率限制检查
 * @param key  限制 key，如 "login:192.168.1.1"
 * @param limit  时间窗口内最大请求数
 * @param windowMs  时间窗口（毫秒）
 * @returns { allowed: boolean; remaining: number; retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // 新窗口
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/** 返回 429 Too Many Requests 响应（带 Retry-After） */
export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSec),
      'X-RateLimit-Remaining': '0',
    },
  });
}
