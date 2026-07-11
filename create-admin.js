const bcrypt = require('bcryptjs');
const { initDB, db } = require('./db');

async function createAdmin() {
  await initDB();

  const username = 'admin';
  const password = 'admin123';
  const fullName = 'Administrator';

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log('Admin account already exists.');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    process.exit(0);
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)').run(username, hash, fullName, 'admin');

  console.log('\n  Admin account created successfully!\n');
  console.log('  Username: admin');
  console.log('  Password: admin123\n');
  process.exit(0);
}

createAdmin();
