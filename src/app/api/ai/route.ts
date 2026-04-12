import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit';

const GATEWAY_TOKEN = process.env.QCLAW_GATEWAY_TOKEN || 'b03e535d929b36bcdd30b85471752963eb5f07a79ea03494';
const GATEWAY_URL   = process.env.QCLAW_GATEWAY_URL   || 'http://localhost:28789';

// AI 调用频率限制：每分钟 20 次
const AI_RATE_LIMIT = 20;
const AI_WINDOW_MS  = 60 * 1000;

// 允许的模型列表（防止注入）
const ALLOWED_MODELS = new Set(['modelroute', 'glm-4', 'gpt-4o', 'claude-3-sonnet']);

const MAX_TOKEN_LIMIT = 4000;
const MAX_MESSAGE_LENGTH = 8000;   // 单条消息最大字符数

export async function POST(req: NextRequest) {
  // ── 速率限制 ──────────────────────────────────
  const ip = getClientIP(req);
  const aiKey = `ai:${ip}`;
  const { allowed, retryAfterMs } = checkRateLimit(aiKey, AI_RATE_LIMIT, AI_WINDOW_MS);
  if (!allowed) {
    return rateLimitResponse(retryAfterMs);
  }

  // ── 认证 ─────────────────────────────────────
  const sessionId = req.cookies.get('session_id')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // ── 参数校验 ──────────────────────────────────
  let body: { messages?: unknown; model?: string; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // 白名单模型
  const model = String(body.model ?? 'modelroute').toLowerCase().trim();
  if (!ALLOWED_MODELS.has(model)) {
    return NextResponse.json({ error: '不支持该模型' }, { status: 400 });
  }

  // max_tokens 上限
  const maxTokens = Math.min(Number(body.max_tokens) || 2000, MAX_TOKEN_LIMIT);

  // 消息必须是数组，且不能太大
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'messages 必须是数组' }, { status: 400 });
  }
  if (body.messages.length === 0 || body.messages.length > 20) {
    return NextResponse.json({ error: '消息数量无效' }, { status: 400 });
  }

  // 内容长度限制（防恶意输入）
  const safeMessages = (body.messages as Array<{role?: string; content?: string}>)
    .filter(m => typeof m.content === 'string' && m.content.length <= MAX_MESSAGE_LENGTH)
    .map(m => ({
      role: String(m.role).toLowerCase(),
      content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
    }));

  if (safeMessages.length === 0) {
    return NextResponse.json({ error: '消息内容为空或无效' }, { status: 400 });
  }

  // ── 调用 AI ──────────────────────────────────
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ model, messages: safeMessages, max_tokens: maxTokens }),
      // AI 调用超时 60 秒
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const error = await res.text().catch(() => '');
      console.error('AI gateway error:', res.status, error);
      return NextResponse.json({ error: 'AI 服务暂时不可用' }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ content });
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'AI 响应超时，请重试' }, { status: 504 });
    }
    console.error('AI route error:', err);
    return NextResponse.json({ error: 'AI 请求失败' }, { status: 500 });
  }
}
