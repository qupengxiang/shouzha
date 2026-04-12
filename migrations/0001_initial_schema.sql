-- ============================================================
-- 手札 D1 数据库 Schema
-- Cloudflare D1 (SQLite 兼容)
-- ============================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL UNIQUE,
  email      TEXT,
  password_hash TEXT  NOT NULL,
  role       TEXT    NOT NULL DEFAULT 'user',
  avatar     TEXT,
  bio        TEXT,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL,
  last_login_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 3. 分类表
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- 4. 文章表
CREATE TABLE IF NOT EXISTS articles (
  id            TEXT    PRIMARY KEY,
  title         TEXT    NOT NULL,
  category_id   TEXT,
  category_slug TEXT,
  category_name TEXT,
  date          TEXT,
  read_time     TEXT,
  tags          TEXT    NOT NULL DEFAULT '[]',   -- JSON 数组
  excerpt       TEXT,
  content       TEXT    NOT NULL,
  cover_image   TEXT,
  published     INTEGER NOT NULL DEFAULT 0,
  author_id     INTEGER,
  view_count    INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id)   REFERENCES users(id)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_slug);
CREATE INDEX IF NOT EXISTS idx_articles_date     ON articles(date);

-- 5. 小程序（造物）表
CREATE TABLE IF NOT EXISTS mini_programs (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT,
  cover_image TEXT,
  open_link   TEXT    NOT NULL,
  published   INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mini_programs_published ON mini_programs(published);
CREATE INDEX IF NOT EXISTS idx_mini_programs_sort     ON mini_programs(sort_order);

-- 6. 评论表
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT    NOT NULL,
  user_id    INTEGER,
  parent_id  INTEGER,
  content    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'approved',
  created_at TEXT    NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);

-- ============================================================
-- 初始化数据
-- ============================================================

-- 默认管理员（密码: jianguo2026，与原来保持一致）
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, bio, created_at, updated_at)
VALUES (
  1,
  'admin',
  'admin@shouzha.local',
  '5c0720d5a67de5a8d4d7a6d7c1e9b3a4c5f8d2e1a3b5c7d9e0f1a2b3c4d5e6f7',
  'admin',
  '系统管理员',
  datetime('now'),
  datetime('now')
);

-- 初始分类
INSERT OR IGNORE INTO categories (id, name, slug, sort_order, created_at) VALUES
  ('1', '生活',     'life',     1, datetime('now')),
  ('2', '学习与工作', 'learn',  2, datetime('now')),
  ('3', '思考与成长', 'think',  3, datetime('now')),
  ('4', '知识积累',  'knowledge', 4, datetime('now'));
