/**
 * 手札数据库层 — JSON 文件存储
 * 简单、可靠、无原生依赖
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(file: string, defaults: T): T {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw) as T;
    }
  } catch {}
  return defaults;
}

function writeJson<T>(file: string, data: T): void {
  ensureDir(path.dirname(file));
  if (fs.existsSync(file)) {
    ensureDir(BACKUP_DIR);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `${path.basename(file)}.${ts}.bak`);
    try { fs.copyFileSync(file, backupFile); } catch {}
    try {
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(path.basename(file)))
        .sort().reverse();
      backups.slice(5).forEach(b => fs.unlinkSync(path.join(BACKUP_DIR, b)));
    } catch {}
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

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
  published: boolean; authorId?: number; viewCount: number; likeCount: number; commentCount: number;
  createdAt: string; updatedAt: string;
}

export interface Category {
  id: string; name: string; slug: string; sortOrder: number; createdAt: string;
}

export interface Comment {
  id: number; articleId: string; userId?: number; parentId?: number;
  content: string; status: string; createdAt: string;
}

export interface MiniProgram {
  id: string; title: string; description?: string; coverImage?: string;
  openLink: string; published: boolean; sortOrder?: number;
  createdAt: string; updatedAt: string;
}

export interface Like {
  id: number; articleId?: string; commentId?: string; userId?: number; createdAt: string;
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const MINI_PROGRAMS_FILE = path.join(DATA_DIR, 'mini-programs.json');
const LIKES_FILE = path.join(DATA_DIR, 'likes.json');

function loadUsers(): User[] { return readJson(USERS_FILE, []); }
function saveUsers(u: User[]) { writeJson(USERS_FILE, u); }
function loadSessions(): Session[] { return readJson(SESSIONS_FILE, []); }
function saveSessions(s: Session[]) { writeJson(SESSIONS_FILE, s); }
function loadArticles(): Article[] { return readJson(ARTICLES_FILE, []); }
function saveArticles(a: Article[]) { writeJson(ARTICLES_FILE, a); }
function loadCategories(): Category[] { return readJson(CATEGORIES_FILE, []); }
function saveCategories(c: Category[]) { writeJson(CATEGORIES_FILE, c); }
function loadComments(): Comment[] { return readJson(COMMENTS_FILE, []); }
function saveComments(c: Comment[]) { writeJson(COMMENTS_FILE, c); }
function loadMiniPrograms(): MiniProgram[] { return readJson(MINI_PROGRAMS_FILE, []); }
function saveMiniPrograms(m: MiniProgram[]) { writeJson(MINI_PROGRAMS_FILE, m); }
function loadLikes(): Like[] { return readJson(LIKES_FILE, []); }
function saveLikes(l: Like[]) { writeJson(LIKES_FILE, l); }

const SALT = 'shouzha-salt-v1';

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 100000, 64, 'sha256').toString('hex');
}

export function verifyPassword(password: string, hashed: string): boolean {
  return hashPassword(password) === hashed;
}

export function initData(): void {
  const users = loadUsers();
  if (!users.find(u => u.username === 'admin')) {
    users.push({ id: 1, username: 'admin', email: 'admin@shouzha.local', passwordHash: hashPassword('jianguo2026'), role: 'admin', bio: '系统管理员', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    saveUsers(users);
  }
  const categories = loadCategories();
  if (categories.length === 0) {
    categories.push(...[
      { id: '1', name: '生活', slug: 'life', sortOrder: 1, createdAt: new Date().toISOString() },
      { id: '2', name: '学习与工作', slug: 'learn', sortOrder: 2, createdAt: new Date().toISOString() },
      { id: '3', name: '思考与成长', slug: 'think', sortOrder: 3, createdAt: new Date().toISOString() },
      { id: '4', name: '知识积累', slug: 'knowledge', sortOrder: 4, createdAt: new Date().toISOString() },
    ]);
    saveCategories(categories);
  }
}

initData();

export function getUserByUsername(username: string): User | null {
  return loadUsers().find(u => u.username === username) || null;
}

export function getUserById(id: number): User | null {
  return loadUsers().find(u => u.id === id) || null;
}

export function createUser(username: string, password: string, email?: string): number {
  const users = loadUsers();
  const maxId = users.reduce((m, u) => Math.max(m, u.id), 0);
  const now = new Date().toISOString();
  users.push({ id: maxId + 1, username, email, passwordHash: hashPassword(password), role: 'user', createdAt: now, updatedAt: now });
  saveUsers(users);
  return maxId + 1;
}

export function changePassword(userId: number, newPassword: string): void {
  const users = loadUsers();
  const u = users.find(u => u.id === userId);
  if (u) { u.passwordHash = hashPassword(newPassword); u.updatedAt = new Date().toISOString(); saveUsers(users); }
}

export function updateLastLogin(userId: number): void {
  const users = loadUsers();
  const u = users.find(u => u.id === userId);
  if (u) { u.lastLoginAt = new Date().toISOString(); saveUsers(users); }
}

export function deleteUser(userId: number): void {
  saveUsers(loadUsers().filter(u => u.id !== userId));
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function createSession(userId: number): string {
  const sessions = loadSessions();
  const now = new Date();
  const session: Session = {
    id: generateSessionId(), userId, createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  sessions.push(session);
  saveSessions(sessions);
  return session.id;
}

export function getSession(sessionId: string): { userId: number; expiresAt: string } | null {
  const sessions = loadSessions();
  const s = sessions.find(s => s.id === sessionId);
  if (!s) return null;
  if (new Date(s.expiresAt) < new Date()) {
    saveSessions(sessions.filter(s => s.id !== sessionId));
    return null;
  }
  return { userId: s.userId, expiresAt: s.expiresAt };
}

export function deleteSession(sessionId: string): void {
  saveSessions(loadSessions().filter(s => s.id !== sessionId));
}

export function getAllArticles(): Article[] { return loadArticles(); }
export function getPublishedArticles(): Article[] { return loadArticles().filter(a => a.published); }
export function getArticleById(id: string): Article | null { return loadArticles().find(a => a.id === id) || null; }

export function createArticle(article: Article): void {
  const now = new Date().toISOString();
  saveArticles([...loadArticles(), { ...article, createdAt: now, updatedAt: now }]);
}

export function updateArticle(id: string, updates: Partial<Article>): void {
  const articles = loadArticles();
  const idx = articles.findIndex(a => a.id === id);
  if (idx !== -1) { articles[idx] = { ...articles[idx], ...updates, updatedAt: new Date().toISOString() }; saveArticles(articles); }
}

export function deleteArticle(id: string): void { saveArticles(loadArticles().filter(a => a.id !== id)); }
export function incrementViewCount(id: string): void {
  const articles = loadArticles();
  const a = articles.find(a => a.id === id);
  if (a) { a.viewCount++; saveArticles(articles); }
}

export function getArticlesByCategory(categorySlug: string): Article[] {
  return loadArticles().filter(a => a.categorySlug === categorySlug && a.published);
}

export function getArticlesByYear(year: number): Article[] {
  return loadArticles().filter(a => a.date?.startsWith(String(year)) && a.published);
}

export function getStats() {
  const articles = loadArticles();
  const users = loadUsers();
  const categories = loadCategories();
  return { total: articles.length, published: articles.filter(a => a.published).length, drafts: articles.filter(a => !a.published).length, categories: categories.length, tags: new Set(articles.flatMap(a => a.tags)).size, users: users.length };
}

export function getAllCategories(): Category[] { return loadCategories().sort((a, b) => a.sortOrder - b.sortOrder); }
export function getCategoryBySlug(slug: string): Category | null { return loadCategories().find(c => c.slug === slug) || null; }

export function createCategory(data: { name: string; slug: string; sortOrder?: number }): void {
  const categories = loadCategories();
  const maxId = categories.reduce((m, c) => Math.max(m, parseInt(c.id) || 0), 0);
  categories.push({ id: String(maxId + 1), name: data.name, slug: data.slug, sortOrder: data.sortOrder || 0, createdAt: new Date().toISOString() });
  saveCategories(categories);
}

export function updateCategory(id: string, updates: { name?: string; slug?: string; sortOrder?: number }): void {
  const categories = loadCategories();
  const idx = categories.findIndex(c => c.id === id);
  if (idx !== -1) { categories[idx] = { ...categories[idx], ...updates, sortOrder: updates.sortOrder ?? categories[idx].sortOrder }; saveCategories(categories); }
}

export function deleteCategory(id: string): void { saveCategories(loadCategories().filter(c => c.id !== id)); }

export function createComment(articleId: string, content: string, userId?: number, parentId?: number): void {
  const comments = loadComments();
  const maxId = comments.reduce((m, c) => Math.max(m, c.id), 0);
  comments.push({ id: maxId + 1, articleId, userId, parentId, content, status: 'approved', createdAt: new Date().toISOString() });
  saveComments(comments);
  const articles = loadArticles();
  const a = articles.find(a => a.id === articleId);
  if (a) { a.commentCount++; saveArticles(articles); }
}

export function getCommentsByArticle(articleId: string): Comment[] { return loadComments().filter(c => c.articleId === articleId && c.status === 'approved'); }

export function getPublishedMiniPrograms(): MiniProgram[] { return loadMiniPrograms().filter(m => m.published); }
export function getAllMiniPrograms(): MiniProgram[] { return loadMiniPrograms(); }
export function getMiniProgramById(id: string): MiniProgram | null { return loadMiniPrograms().find(m => m.id === id) || null; }

export function createMiniProgram(data: Omit<MiniProgram, 'createdAt' | 'updatedAt'>): void {
  const now = new Date().toISOString();
  saveMiniPrograms([...loadMiniPrograms(), { ...data, createdAt: now, updatedAt: now }]);
}

export function updateMiniProgram(id: string, updates: Partial<MiniProgram>): void {
  const programs = loadMiniPrograms();
  const idx = programs.findIndex(m => m.id === id);
  if (idx !== -1) { programs[idx] = { ...programs[idx], ...updates, updatedAt: new Date().toISOString() }; saveMiniPrograms(programs); }
}

export function deleteMiniProgram(id: string): void { saveMiniPrograms(loadMiniPrograms().filter(m => m.id !== id)); }
