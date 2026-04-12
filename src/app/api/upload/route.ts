import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, getUserById } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

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
    magic: [['52494647', 'WEBP']], // RIFF....WEBP
  },
  svg: {
    mime: ['image/svg+xml'],
    magic: [], // SVG 纯文本，后面单独过滤
  },
};

const MAX_SIZE     = 10 * 1024 * 1024;   // 10MB
const MAX_REQUEST  = 5 * 1024 * 1024;  // 整体请求体上限 5MB（比 MAX_SIZE 小，防放大攻击）
const UPLOAD_WINDOW_MS = 60 * 1000;
const UPLOAD_RATE_LIMIT = 10;            // 每分钟最多 10 次上传

// SVG 安全：禁止 script / on* / javascript:
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
  const session = getSession(sessionId);
  if (!session) return false;
  const user = getUserById(session.userId);
  return user?.role === 'admin';
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

    // 生成安全文件名（只保留字母数字）
    const safeExt = typeConfig.mime[0].split('/')[1].replace('jpeg', 'jpg');
    const filename = `${uuidv4()}.${safeExt}`;

    // 按年月分目录
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const subDir = path.join(UPLOAD_DIR, yearMonth);
    await mkdir(subDir, { recursive: true });

    const filePath = path.join(subDir, filename);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/${yearMonth}/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicPath,
      filename,
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
