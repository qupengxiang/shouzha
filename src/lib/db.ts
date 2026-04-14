/**
 * 手札数据库层
 * 本地开发: SQLite (better-sqlite3)
 * 生产环境: Cloudflare D1 REST API
 * D1 表结构使用 snake_case 列名
 */
import crypto from 'crypto';

// ─── 配置 ─────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';
const ACCOUNT_ID  = process.env.CLOUDFLARE_ACCOUNT_ID ?? 'e58caa7334ca1c169afbdfc72a0129ed';
const DATABASE_ID = process.env.D1_DATABASE_ID        ?? '908684be-d74b-48b5-b49b-50948d121a08';
const API_TOKEN   = process.env.CLOUDFLARE_API_TOKEN   ?? '';

// 本地 SQLite 数据库
let sqliteDB: any = null;
if (isDev) {
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'data.db');
    sqliteDB = new Database(dbPath);
    sqliteDB.pragma('journal_mode = WAL');
    console.log('Using local SQLite database:', dbPath);
  } catch (e) {
    console.error('Failed to load better-sqlite3:', e);
  }
}

// Cloudflare Workers D1 绑定
let d1DB: any = null;
try {
  // 尝试获取 D1 绑定
  // @ts-ignore - 类型定义问题，运行时存在
  d1DB = globalThis.DB || globalThis.NEXT_TAG_CACHE_D1;
  if (d1DB) {
    console.log('Using Cloudflare D1 database binding');
  }
} catch (e) {
  console.error('Failed to get D1 binding:', e);
}

// 初始化本地数据库
if (sqliteDB) {
  console.log('Initializing local SQLite database...');
  
  try {
    // 执行初始化 SQL
    sqliteDB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        avatar TEXT,
        bio TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
      
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
      CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
      
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category_id TEXT,
        category_slug TEXT,
        category_name TEXT,
        date TEXT,
        read_time TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        excerpt TEXT,
        content TEXT NOT NULL,
        cover_image TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        author_id INTEGER,
        view_count INTEGER NOT NULL DEFAULT 0,
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_slug);
      CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date);
      
      CREATE TABLE IF NOT EXISTS mini_programs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        cover_image TEXT,
        open_link TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_mini_programs_published ON mini_programs(published);
      CREATE INDEX IF NOT EXISTS idx_mini_programs_sort ON mini_programs(sort_order);
      
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id TEXT NOT NULL,
        user_id INTEGER,
        parent_id INTEGER,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        created_at TEXT NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);
    `);
    console.log('✓ Tables created successfully');
    
    // 插入默认管理员（密码: jianguo2026）
    const adminExists = sqliteDB.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
    if (adminExists.count === 0) {
      const hashedPassword = '4b6ad5ed413db5ba33d168d0c951e995236eb2a2d7205cdb3835731ccc71dd97540be2b02ccbd29bc3fbfd2b85b7ff3bdf6fd3c36eb273816a49cddfbfdd1486';
      const now = new Date().toISOString();
      sqliteDB.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, bio, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(1, 'admin', 'admin@shouzha.local', hashedPassword, 'admin', '系统管理员', now, now);
      console.log('✓ Created default admin user: admin / jianguo2026');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    // 插入初始分类
    const categoryCount = sqliteDB.prepare('SELECT COUNT(*) as count FROM categories').get();
    if (categoryCount.count === 0) {
      const now = new Date().toISOString();
      const categories = [
        { id: '1', name: '生活', slug: 'life', sort_order: 1 },
        { id: '2', name: '学习与工作', slug: 'learn', sort_order: 2 },
        { id: '3', name: '思考与成长', slug: 'think', sort_order: 3 },
        { id: '4', name: '知识积累', slug: 'knowledge', sort_order: 4 }
      ];
      const insertCategory = sqliteDB.prepare(`
        INSERT INTO categories (id, name, slug, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      categories.forEach(cat => {
        insertCategory.run(cat.id, cat.name, cat.slug, cat.sort_order, now);
      });
      console.log('✓ Created initial categories');
    } else {
      console.log('✓ Categories already exist');
    }
    
    console.log('✓ Local database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

function d1Query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (sqliteDB) {
    return new Promise((resolve) => {
      const stmt = sqliteDB.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows as T[]);
    });
  }
  
  if (d1DB) {
    return d1DB.prepare(sql).all(...params) as Promise<T[]>;
  }
  
  // 后备：使用 REST API
  let i = 0;
  const d1Sql = sql.replace(/\?/g, () => `$${++i}`);
  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: d1Sql, params }),
    }
  ).then(r => r.json())
    .then((j: { result?: { results: T[] }[] }) => j.result?.[0]?.results ?? []);
}

function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
  if (sqliteDB) {
    return new Promise((resolve) => {
      const stmt = sqliteDB.prepare(sql);
      stmt.run(...params);
      resolve();
    });
  }
  
  if (d1DB) {
    d1DB.prepare(sql).run(...params);
    return Promise.resolve();
  }
  
  // 后备：使用 REST API
  let i = 0;
  const d1Sql = sql.replace(/\?/g, () => `$${++i}`);
  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: d1Sql, params }),
    }
  ).then(r => r.json()).then(() => {});
}

// ─── 类型（API 层用 camelCase，内部统一用 D1 snake_case）─────────────────────────
export interface User {
  id: number; username: string; email?: string; passwordHash: string;
  role: string; avatar?: string; bio?: string; createdAt: string; updatedAt: string; lastLoginAt?: string;
}
export interface Session {
  id: string; userId: number; expiresAt: string; createdAt: string;
}
export interface Article {
  id: string; title: string; category: string; categorySlug: string;
  date: string; readTime: string; tags: string[]; excerpt: string; content: string;
  published: boolean; authorId?: number; viewCount: number; likeCount: number;
  commentCount: number; createdAt: string; updatedAt: string; coverImage?: string;
}
export interface Category {
  id: string; name: string; slug: string; sortOrder: number; createdAt: string;
  icon?: string; desc?: string; color?: string;
}
export interface Comment {
  id: number; articleId: string; userId?: number; parentId?: number;
  content: string; status: string; createdAt: string;
}
export interface MiniProgram {
  id: string; title: string; description?: string; coverImage?: string;
  openLink: string; published: boolean; sortOrder?: number; createdAt: string; updatedAt: string;
}
export interface Like {
  id: number; articleId?: string; commentId?: string; userId?: number; createdAt: string;
}

// ─── 行转换 ────────────────────────────────────────────────────────────────────
function rowToArticle(r: Record<string, unknown>): Article {
  return {
    id:            r.id as string,
    title:         r.title as string,
    category:      r.category_name as string || '',
    categorySlug:  r.category_slug as string || '',
    date:          r.date as string || '',
    readTime:      r.read_time as string || '',
    tags:          typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags as string[] || []),
    excerpt:       r.excerpt as string || '',
    content:       r.content as string || '',
    published:     Boolean(r.published),
    authorId:      r.author_id as number | undefined,
    viewCount:     Number(r.view_count) || 0,
    likeCount:     Number(r.like_count) || 0,
    commentCount:  Number(r.comment_count) || 0,
    createdAt:     r.created_at as string || '',
    updatedAt:     r.updated_at as string || '',
    coverImage:    r.cover_image as string | undefined,
  };
}

function rowToUser(r: Record<string, unknown>): User {
  return {
    id:           r.id as number,
    username:     r.username as string,
    email:        (r.email || r.Email) as string | undefined,
    passwordHash: (r.password_hash || r.passwordHash || r.passwordhash) as string,
    role:         r.role as string,
    avatar:       (r.avatar || r.Avatar) as string | undefined,
    bio:          (r.bio || r.Bio) as string | undefined,
    createdAt:    (r.created_at || r.createdAt || r.createdat) as string,
    updatedAt:    (r.updated_at || r.updatedAt || r.updatedat) as string,
    lastLoginAt:  (r.last_login_at || r.lastLoginAt || r.lastloginat) as string | undefined,
  };
}

function rowToCategory(r: Record<string, unknown>): Category {
  return {
    id:         r.id as string,
    name:       r.name as string,
    slug:       r.slug as string,
    sortOrder:  Number(r.sort_order) || 0,
    createdAt:  r.created_at as string,
    icon:       r.icon as string | undefined,
    desc:       r.desc as string | undefined,
    color:      r.color as string | undefined,
  };
}

function rowToSession(r: Record<string, unknown>): Session {
  return {
    id:        r.id as string,
    userId:    r.user_id as number,
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
  };
}

// ─── 密码 ─────────────────────────────────────────────────────────────────────
const SALT = 'shouzha-salt-v1';
const SALT_BYTES = new TextEncoder().encode(SALT);

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
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

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hashed;
}

// ─── 用户 ──────────────────────────────────────────────────────────────────────
export async function getUserByUsername(username: string): Promise<User | null> {
  if (isDev && username === 'admin') {
    // 本地开发环境的测试用户
    return {
      id: 1,
      username: 'admin',
      email: 'admin@shouzha.local',
      passwordHash: '4b6ad5ed413db5ba33d168d0c951e995236eb2a2d7205cdb3835731ccc71dd97540be2b02ccbd29bc3fbfd2b85b7ff3bdf6fd3c36eb273816a49cddfbfdd1486',
      role: 'admin',
      bio: '系统管理员',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }
  
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] ? rowToUser(rows[0]) : null;
}
export async function getUserById(id: number): Promise<User | null> {
  if (isDev && id === 1) {
    // 本地开发环境的测试用户
    return {
      id: 1,
      username: 'admin',
      email: 'admin@shouzha.local',
      passwordHash: '4b6ad5ed413db5ba33d168d0c951e995236eb2a2d7205cdb3835731ccc71dd97540be2b02ccbd29bc3fbfd2b85b7ff3bdf6fd3c36eb273816a49cddfbfdd1486',
      role: 'admin',
      bio: '系统管理员',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }
  
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}
export async function createUser(username: string, password: string, email?: string): Promise<number> {
  const now = new Date().toISOString();
  const rows = await d1Query<{ maxId: number }>('SELECT MAX(id) as maxId FROM users');
  const maxId = rows[0]?.maxId ?? 0;
  const hashedPassword = await hashPassword(password);
  await d1Exec(
    'INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [maxId + 1, username, email ?? null, hashedPassword, 'user', now, now]
  );
  return maxId + 1;
}
export async function changePassword(userId: number, newPassword: string): Promise<void> {
  const now = new Date().toISOString();
  const hashedPassword = await hashPassword(newPassword);
  await d1Exec('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hashedPassword, now, userId]);
}
export async function updateLastLogin(userId: number): Promise<void> {
  const now = new Date().toISOString();
  await d1Exec('UPDATE users SET last_login_at = ? WHERE id = ?', [now, userId]);
}
export async function deleteUser(userId: number): Promise<void> {
  await d1Exec('DELETE FROM users WHERE id = ?', [userId]);
}

// 获取所有用户（管理员用）
export async function getAllUsers(): Promise<User[]> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(rowToUser);
}

// 更新用户信息（角色、邮箱、头像等）
export async function updateUser(userId: number, updates: { email?: string; role?: string; avatar?: string; bio?: string }): Promise<void> {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const vals: unknown[] = [];
  let pi = 1;
  
  Object.entries(updates).forEach(([k, v]) => {
    if (v !== undefined) {
      fields.push(`${k} = $${pi++}`);
      vals.push(v);
    }
  });
  
  if (fields.length === 0) return;
  
  fields.push(`updated_at = $${pi++}`);
  vals.push(now);
  vals.push(userId);
  
  await d1Exec(`UPDATE users SET ${fields.join(', ')} WHERE id = $${pi}`, vals);
}

// 管理员重置用户密码
export async function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  await changePassword(userId, newPassword);
}

// ─── Session ───────────────────────────────────────────────────────────────────
export function generateSessionId(): string { return crypto.randomUUID(); }
export async function createSession(userId: number): Promise<string> {
  const now = new Date();
  const sessionId = generateSessionId();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await d1Exec('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [sessionId, userId, expiresAt, now.toISOString()]);
  return sessionId;
}
export async function getSession(sessionId: string): Promise<{ userId: number; expiresAt: string } | null> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM sessions WHERE id = ? LIMIT 1', [sessionId]);
  const s = rows[0];
  if (!s) return null;
  if (new Date(s.expires_at as string) < new Date()) {
    await d1Exec('DELETE FROM sessions WHERE id = ?', [sessionId]);
    return null;
  }
  return { userId: s.user_id as number, expiresAt: s.expires_at as string };
}
export async function deleteSession(sessionId: string): Promise<void> {
  await d1Exec('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

// ─── 文章 ─────────────────────────────────────────────────────────────────────
// 获取所有文章（管理员看全部，普通用户只看自己的）
export async function getAllArticles(userId?: number, role?: string): Promise<Article[]> {
  let sql = 'SELECT * FROM articles';
  const params: unknown[] = [];
  
  // 非管理员只能看到自己的文章
  if (userId && role !== 'admin') {
    sql += ' WHERE author_id = ?';
    params.push(userId);
  }
  
  sql += ' ORDER BY created_at DESC';
  const rows = await d1Query(sql, params);
  return rows.map(r => rowToArticle(r as Record<string, unknown>));
}

export async function getPublishedArticles(): Promise<Article[]> {
  const rows = await d1Query('SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC');
  return rows.map(r => rowToArticle(r as Record<string, unknown>));
}
export async function getArticleById(id: string): Promise<Article | null> {
  const rows = await d1Query('SELECT * FROM articles WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? rowToArticle(rows[0] as Record<string, unknown>) : null;
}
export async function createArticle(article: Article): Promise<void> {
  const now = new Date().toISOString();
  await d1Exec(
    `INSERT INTO articles (id, title, category_name, category_slug, date, read_time, tags, excerpt, content, published, author_id, view_count, like_count, comment_count, created_at, updated_at, cover_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [article.id, article.title, article.category, article.categorySlug, article.date, article.readTime,
     JSON.stringify(article.tags ?? []), article.excerpt, article.content, article.published ? 1 : 0,
     article.authorId ?? null, 0, 0, 0, now, now, article.coverImage ?? null]
  );
}
export async function updateArticle(id: string, updates: Partial<Article>): Promise<void> {
  const now = new Date().toISOString();
  const fields: string[] = []; const vals: unknown[] = []; let pi = 1;
  Object.entries(updates).forEach(([k, v]) => {
    const d1Col: Record<string, string> = {
      category: 'category_name', categorySlug: 'category_slug', readTime: 'read_time',
      coverImage: 'cover_image', viewCount: 'view_count', likeCount: 'like_count',
      commentCount: 'comment_count', createdAt: 'created_at', updatedAt: 'updated_at',
      authorId: 'author_id',
    };
    const col = d1Col[k] ?? k;
    if (k === 'tags') { fields.push(`${col} = $${pi++}`); vals.push(JSON.stringify(v)); }
    else if (k === 'published') { fields.push(`${col} = $${pi++}`); vals.push(v ? 1 : 0); }
    else { fields.push(`${col} = $${pi++}`); vals.push(v); }
  });
  fields.push(`updated_at = $${pi++}`); vals.push(now); vals.push(id);
  await d1Exec(`UPDATE articles SET ${fields.join(', ')} WHERE id = $${pi}`, vals);
}
export async function deleteArticle(id: string): Promise<void> {
  await d1Exec('DELETE FROM articles WHERE id = ?', [id]);
}
export async function incrementViewCount(id: string): Promise<void> {
  await d1Exec('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [id]);
}
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const rows = await d1Query('SELECT * FROM articles WHERE category_slug = ? AND published = 1 ORDER BY created_at DESC', [categorySlug]);
  return rows.map(r => rowToArticle(r as Record<string, unknown>));
}
export async function getArticlesByYear(year: number): Promise<Article[]> {
  const rows = await d1Query('SELECT * FROM articles WHERE date LIKE ? AND published = 1 ORDER BY date DESC', [`${year}%`]);
  return rows.map(r => rowToArticle(r as Record<string, unknown>));
}
export async function getStats() {
  const [total, published, cats] = await Promise.all([
    d1Query<{ n: number }>('SELECT COUNT(*) as n FROM articles'),
    d1Query<{ n: number }>('SELECT COUNT(*) as n FROM articles WHERE published = 1'),
    d1Query<{ n: number }>('SELECT COUNT(*) as n FROM categories'),
  ]);
  return { total: total[0]?.n ?? 0, published: published[0]?.n ?? 0, drafts: (total[0]?.n ?? 0) - (published[0]?.n ?? 0), categories: cats[0]?.n ?? 0, tags: 0, users: 1 };
}

// ─── 分类 ─────────────────────────────────────────────────────────────────────
export async function getAllCategories(): Promise<Category[]> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM categories ORDER BY sort_order ASC');
  return rows.map(rowToCategory);
}
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM categories WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] ? rowToCategory(rows[0]) : null;
}
export async function createCategory(data: { name: string; slug: string; sortOrder?: number; icon?: string; desc?: string; color?: string }): Promise<void> {
  const now = new Date().toISOString();
  const rows = await d1Query<{ maxId: number }>('SELECT MAX(CAST(id AS INTEGER)) as maxId FROM categories');
  const maxId = rows[0]?.maxId ?? 0;
  await d1Exec('INSERT INTO categories (id, name, slug, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
    [String(maxId + 1), data.name, data.slug, data.sortOrder ?? 0, now]);
}
export async function updateCategory(id: string, updates: { name?: string; slug?: string; sortOrder?: number; icon?: string; desc?: string; color?: string }): Promise<void> {
  const fields: string[] = []; const vals: unknown[] = []; let pi = 1;
  Object.entries(updates).forEach(([k, v]) => {
    const col = k === 'sortOrder' ? 'sort_order' : k;
    fields.push(`${col} = $${pi++}`); vals.push(v ?? null);
  });
  vals.push(id);
  await d1Exec(`UPDATE categories SET ${fields.join(', ')} WHERE id = $${pi}`, vals);
}
export async function deleteCategory(id: string): Promise<void> {
  await d1Exec('DELETE FROM categories WHERE id = ?', [id]);
}

// ─── 评论 ─────────────────────────────────────────────────────────────────────
export async function createComment(articleId: string, content: string, userId?: number, parentId?: number): Promise<void> {
  const now = new Date().toISOString();
  const rows = await d1Query<{ maxId: number }>('SELECT MAX(id) as maxId FROM comments');
  const maxId = (rows[0]?.maxId ?? 0) + 1;
  await d1Exec('INSERT INTO comments (id, article_id, user_id, parent_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [maxId, articleId, userId ?? null, parentId ?? null, content, 'approved', now]);
  await d1Exec('UPDATE articles SET comment_count = comment_count + 1 WHERE id = ?', [articleId]);
}
export async function getCommentsByArticle(articleId: string): Promise<Comment[]> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM comments WHERE article_id = ? AND status = ? ORDER BY created_at ASC', [articleId, 'approved']);
  return rows.map(r => ({
    id: r.id as number, articleId: r.article_id as string, userId: r.user_id as number | undefined,
    parentId: r.parent_id as number | undefined, content: r.content as string,
    status: r.status as string, createdAt: r.created_at as string,
  }));
}

// ─── 小程序 ────────────────────────────────────────────────────────────────────
export async function getPublishedMiniPrograms(): Promise<MiniProgram[]> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM mini_programs WHERE published = 1 ORDER BY sort_order ASC, created_at DESC');
  return rows.map(r => ({
    id: r.id as string, title: r.title as string, description: r.description as string | undefined,
    coverImage: r.cover_image as string | undefined, openLink: r.open_link as string,
    published: Boolean(r.published), sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }));
}
export async function getAllMiniPrograms(): Promise<MiniProgram[]> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM mini_programs ORDER BY sort_order ASC, created_at DESC');
  return rows.map(r => ({
    id: r.id as string, title: r.title as string, description: r.description as string | undefined,
    coverImage: r.cover_image as string | undefined, openLink: r.open_link as string,
    published: Boolean(r.published), sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }));
}
export async function getMiniProgramById(id: string): Promise<MiniProgram | null> {
  const rows = await d1Query<Record<string, unknown>>('SELECT * FROM mini_programs WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id as string, title: r.title as string, description: r.description as string | undefined,
    coverImage: r.cover_image as string | undefined, openLink: r.open_link as string,
    published: Boolean(r.published), sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}
export async function createMiniProgram(data: Omit<MiniProgram, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date().toISOString();
  await d1Exec(
    `INSERT INTO mini_programs (id, title, description, cover_image, open_link, published, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.title, data.description ?? null, data.coverImage ?? null, data.openLink, data.published ? 1 : 0, data.sortOrder ?? 0, now, now]
  );
}
export async function updateMiniProgram(id: string, updates: Partial<MiniProgram>): Promise<void> {
  const now = new Date().toISOString();
  const fields: string[] = []; const vals: unknown[] = []; let pi = 1;
  Object.entries(updates).forEach(([k, v]) => {
    const col = k === 'openLink' ? 'open_link' : k === 'coverImage' ? 'cover_image' : k === 'sortOrder' ? 'sort_order' : k;
    if (k === 'published') { fields.push(`${col} = $${pi++}`); vals.push(v ? 1 : 0); }
    else { fields.push(`${col} = $${pi++}`); vals.push(v); }
  });
  fields.push(`updated_at = $${pi++}`); vals.push(now); vals.push(id);
  await d1Exec(`UPDATE mini_programs SET ${fields.join(', ')} WHERE id = $${pi}`, vals);
}
export async function deleteMiniProgram(id: string): Promise<void> {
  await d1Exec('DELETE FROM mini_programs WHERE id = ?', [id]);
}
