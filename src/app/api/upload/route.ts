import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, getUserById } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit';

// R2 配置
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'e58caa7334ca1c169afbdfc72a0129ed';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'shouzha-uploads';
const R2_API_TOKEN = process.env.R2_API_TOKEN || '';

// 公开访问地址（需要在 R2 Dashboard 配置后填入）
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`;

// ── 文件类型配置 ─────────────────────────────────
const ALLOWED_TYPES: Record<string, { mime: string[]; magic: [string, string][] }> = {
  jpeg: {
    mime: ['image/jpeg'],
    magic: [['FFD8FF', 'JPEG']],
  },
  png: {
    mime: ['image/png'],
    magic: [['89504E470D0A1A0A', 'PNG']],
  },
  gif: {
    mime: ['image/gif'],
    magic: [['47494638', 'GIF']],
  },
  webp: {
    mime: ['image/webp'],
    magic: [['52494647', 'WEBP']],
  },
  svg: {
    mime: ['image/svg+xml'],
    magic: [],
  },
};

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST = 5 * 1024 * 1024;
const UPLOAD_WINDOW_MS = 60 * 1000;
const UPLOAD_RATE_LIMIT = 10;

const SVG_FORBIDDEN = [/script/i, /on\w+\s*=/i, /javascript:/i, /data:/i, /<iframe/i];

function validateMagicBytes(buffer: Buffer): string | null {
  const hex = buffer.slice(0, 12).toString('hex').toUpperCase();
  for (const [magic, type] of Object.values(ALLOWED_TYPES).flatMap(t => t.magic)) {
    if (hex.startsWith(magic.toUpperCase())) return type;
  }
  return null;
}

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return false;
  const session = await getSession(sessionId);
  if (!session) return false;
  const user = await getUserById(session.userId);
  return user?.role === 'admin';
}

/**
 * 上传文件到 R2
 */
async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects/${key}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${R2_API_TOKEN}`,
          'Content-Type': contentType,
        },
        body: new Uint8Array(buffer),
      }
    );

    const data = await response.json();

    if (!data.success) {
      console.error('R2 upload error:', data.errors);
      return { success: false, error: data.errors?.[0]?.message || '上传失败' };
    }

    return { success: true, url: `${R2_PUBLIC_URL}/${key}` };
  } catch (error) {
    console.error('R2 upload exception:', error);
    return { success: false, error: '网络错误' };
  }
}

export async function POST(req: NextRequest) {
  // 速率限制
  const ip = getClientIP(req);
  const uploadKey = `upload:${ip}`;
  const { allowed, retryAfterMs } = checkRateLimit(uploadKey, UPLOAD_RATE_LIMIT, UPLOAD_WINDOW_MS);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  // 整体请求体大小限制
  const contentLength = parseInt(req.headers.get('content-length') || '0');
  if (contentLength > MAX_REQUEST) {
    return NextResponse.json({ error: '请求体过大，请压缩图片后重试' }, { status: 413 });
  }

  // 权限校验
  if (!await isAdmin()) {
    return NextResponse.json({ error: '未登录或无权限' }, { status: 401 });
  }

  // 检查 R2 配置
  if (!R2_API_TOKEN) {
    return NextResponse.json({ error: 'R2 未配置' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    // 大小校验
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();

    // MIME 类型白名单
    const typeConfig = ALLOWED_TYPES[ext];
    if (!typeConfig) {
      return NextResponse.json({ error: '不支持的图片格式' }, { status: 400 });
    }
    if (!typeConfig.mime.includes(file.type)) {
      return NextResponse.json({ error: '文件类型与扩展名不匹配' }, { status: 400 });
    }

    // 真实文件内容校验（魔数）
    const buffer = Buffer.from(await file.arrayBuffer());
    if (ext !== 'svg') {
      const detected = validateMagicBytes(buffer);
      if (!detected) {
        return NextResponse.json({ error: '文件内容不是有效的图片' }, { status: 400 });
      }
    } else {
      // SVG 额外内容安全检查
      const text = buffer.toString('utf8');
      if (SVG_FORBIDDEN.some(re => re.test(text))) {
        return NextResponse.json({ error: 'SVG 文件包含不安全内容，已拒绝' }, { status: 400 });
      }
    }

    // 生成安全文件名
    const safeExt = typeConfig.mime[0].split('/')[1].replace('jpeg', 'jpg');
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const key = `uploads/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${timestamp}-${randomStr}.${safeExt}`;

    // 上传到 R2
    const result = await uploadToR2(key, buffer, file.type);

    if (!result.success) {
      return NextResponse.json({ error: result.error || '上传失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      key,
      size: buffer.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
