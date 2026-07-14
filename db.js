const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'kova_sales.db');
let _db = null;

function saveToDisk() {
  if (_db) {
    const data = _db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

function wrapStatement(sql) {
  return {
    get(...params) {
      const stmt = _db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const rows = [];
      const stmt = _db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    run(...params) {
      if (params.length > 0) {
        _db.run(sql, params);
      } else {
        _db.run(sql);
      }
      saveToDisk();
      return { changes: _db.getRowsModified() };
    }
  };
}

const wrapper = {
  prepare(sql) {
    return wrapStatement(sql);
  },
  exec(sql) {
    _db.exec(sql);
    saveToDisk();
  },
  pragma(stmt) {
    try { _db.run(`PRAGMA ${stmt}`); } catch(e) {}
  }
};

let ready = false;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  wrapper.pragma('journal_mode = WAL');
  wrapper.pragma('foreign_keys = ON');

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'worker' CHECK(role IN ('admin','worker')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product TEXT NOT NULL CHECK(product IN ('yogurt','tea')),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price > 0),
      total_amount REAL NOT NULL,
      sale_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);

  ready = true;
  return wrapper;
}

module.exports = { db: wrapper, initDB };
