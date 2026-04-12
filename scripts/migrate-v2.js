const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('Running migration...');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    avatar TEXT,
    bio TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  )
`);

// Create sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create comments table
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,
    user_id INTEGER,
    parent_id INTEGER,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'approved',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
  )
`);

// Create likes table
db.exec(`
  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT,
    comment_id INTEGER,
    user_id INTEGER,
    created_at TEXT NOT NULL,
    UNIQUE(article_id, user_id),
    UNIQUE(comment_id, user_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Add new columns to articles table if not exist
try {
  db.exec(`ALTER TABLE articles ADD COLUMN author_id INTEGER`);
  console.log('Added author_id to articles');
} catch (e) {
  console.log('author_id already exists');
}

try {
  db.exec(`ALTER TABLE articles ADD COLUMN view_count INTEGER DEFAULT 0`);
  console.log('Added view_count to articles');
} catch (e) {
  console.log('view_count already exists');
}

try {
  db.exec(`ALTER TABLE articles ADD COLUMN like_count INTEGER DEFAULT 0`);
  console.log('Added like_count to articles');
} catch (e) {
  console.log('like_count already exists');
}

try {
  db.exec(`ALTER TABLE articles ADD COLUMN comment_count INTEGER DEFAULT 0`);
  console.log('Added comment_count to articles');
} catch (e) {
  console.log('comment_count already exists');
}

// Create indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)`);

// Create default admin user
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
  const now = new Date().toISOString();
  const passwordHash = hashPassword('jianguo2026');
  db.prepare(`
    INSERT INTO users (username, email, password_hash, role, bio, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('admin', 'admin@shouzha.local', passwordHash, 'admin', '系统管理员', now, now);
  console.log('✅ Default admin user created: admin / jianguo2026');
} else {
  console.log('Admin user already exists');
}

db.close();
console.log('Migration completed!');
