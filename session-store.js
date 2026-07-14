const { EventEmitter } = require('events');

class SQLiteSessionStore extends EventEmitter {
  constructor(db, interval = 60000) {
    super();
    this.db = db;
    this._interval = interval;
    this._timer = setInterval(() => this.cleanup(), interval);
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row) return callback(null, null);
      if (new Date(row.expires_at) < new Date()) {
        this.destroy(sid, () => {});
        return callback(null, null);
      }
      callback(null, JSON.parse(row.data));
    } catch (e) {
      callback(null, null);
    }
  }

  set(sid, session, callback) {
    try {
      const data = JSON.stringify(session);
      const expires = session.cookie && session.cookie.expires
        ? new Date(session.cookie.expires).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      this.db.prepare('INSERT OR REPLACE INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)').run(sid, data, expires);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  destroy(sid, callback) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  cleanup() {
    try {
      this.db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
    } catch (e) {}
  }

  close() {
    if (this._timer) clearInterval(this._timer);
  }
}

module.exports = SQLiteSessionStore;
