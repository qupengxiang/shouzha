/**
 * 检查本地数据库状态的脚本
 */
const path = require('path');
const dbPath = path.join(process.cwd(), 'data.db');

console.log('Checking database at:', dbPath);

try {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  
  console.log('✓ Database connection successful');
  
  // 检查用户表
  const users = db.prepare('SELECT * FROM users').all();
  console.log('\nUsers in database:');
  users.forEach(user => {
    console.log(`- ${user.username} (${user.role})`);
    console.log(`  Password hash: ${user.password_hash.substring(0, 20)}...`);
    console.log(`  Hash length: ${user.password_hash.length}`);
  });
  
  // 检查分类表
  const categories = db.prepare('SELECT * FROM categories').all();
  console.log('\nCategories in database:');
  categories.forEach(cat => {
    console.log(`- ${cat.name} (${cat.slug})`);
  });
  
  db.close();
  console.log('\n✓ Database check completed');
} catch (error) {
  console.error('Error checking database:', error);
}
