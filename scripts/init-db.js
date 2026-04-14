/**
 * 初始化本地 SQLite 数据库的脚本
 */
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data.db');
console.log('Initializing database at:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

try {
  // 创建所有表
  console.log('Creating tables...');
  db.exec(`
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
  
  // 插入默认管理员
  console.log('Creating admin user...');
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
  if (adminExists.count === 0) {
    const hashedPassword = '4b6ad5ed413db5ba33d168d0c951e995236eb2a2d7205cdb3835731ccc71dd97540be2b02ccbd29bc3fbfd2b85b7ff3bdf6fd3c36eb273816a49cddfbfdd1486';
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(1, 'admin', 'admin@shouzha.local', hashedPassword, 'admin', '系统管理员', now, now);
    console.log('✓ Admin user created: admin / jianguo2026');
  } else {
    console.log('✓ Admin user already exists');
  }
  
  // 插入初始分类
  console.log('Creating categories...');
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count === 0) {
    const now = new Date().toISOString();
    const categories = [
      { id: '1', name: '生活', slug: 'life', sort_order: 1 },
      { id: '2', name: '学习与工作', slug: 'learn', sort_order: 2 },
      { id: '3', name: '思考与成长', slug: 'think', sort_order: 3 },
      { id: '4', name: '知识积累', slug: 'knowledge', sort_order: 4 }
    ];
    const insertCategory = db.prepare(`
      INSERT INTO categories (id, name, slug, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    categories.forEach(cat => {
      insertCategory.run(cat.id, cat.name, cat.slug, cat.sort_order, now);
    });
    console.log('✓ Categories created');
  } else {
    console.log('✓ Categories already exist');
  }
  
  // 验证数据
  console.log('\nVerifying data...');
  const users = db.prepare('SELECT * FROM users').all();
  console.log(`Users: ${users.length}`);
  users.forEach(user => {
    console.log(`- ${user.username} (${user.role})`);
  });
  
  const cats = db.prepare('SELECT * FROM categories').all();
  console.log(`\nCategories: ${cats.length}`);
  cats.forEach(cat => {
    console.log(`- ${cat.name} (${cat.slug})`);
  });
  
  console.log('\n✓ Database initialized successfully!');
  
} catch (error) {
  console.error('Error initializing database:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}
