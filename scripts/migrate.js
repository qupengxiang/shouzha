const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data.db');
const JSON_PATH = path.join(process.cwd(), 'articles.json');

// Initialize DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    category_slug TEXT NOT NULL,
    date TEXT NOT NULL,
    read_time TEXT NOT NULL DEFAULT '5 分钟',
    tags TEXT,
    excerpt TEXT,
    content TEXT,
    published INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Create indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_slug)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published)`);

// Migrate data
try {
  const data = fs.readFileSync(JSON_PATH, 'utf-8');
  const articles = JSON.parse(data);
  
  if (!Array.isArray(articles) || articles.length === 0) {
    console.log('没有需要迁移的数据');
    process.exit(0);
  }
  
  console.log(`发现 ${articles.length} 篇文章，开始迁移...`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO articles 
    (id, title, category, category_slug, date, read_time, tags, excerpt, content, published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((articles) => {
    for (const article of articles) {
      insert.run(
        article.id,
        article.title,
        article.category,
        article.categorySlug,
        article.date,
        article.readTime,
        JSON.stringify(article.tags || []),
        article.excerpt || '',
        article.content || '',
        article.published ? 1 : 0,
        article.createdAt,
        article.updatedAt
      );
    }
  });
  
  insertMany(articles);
  
  console.log('✓ 迁移完成！');
  
  // Backup old JSON
  const backupPath = path.join(process.cwd(), 'articles.json.backup');
  fs.renameSync(JSON_PATH, backupPath);
  console.log(`✓ 原文件已备份到: ${backupPath}`);
  
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log('没有找到 articles.json，跳过迁移');
  } else {
    console.error('迁移失败:', e);
    process.exit(1);
  }
}

db.close();
console.log('数据库已初始化');
