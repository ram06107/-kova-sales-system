const { EventEmitter } = require('events');

class SupabaseSessionStore extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
  }

  async get(sid, callback) {
    try {
      const session = await this.db.sessions.get(sid);
      callback(null, session);
    } catch (e) {
      callback(e);
    }
  }

  async set(sid, session, callback) {
    try {
      const expires = session.cookie && session.cookie.expires
        ? new Date(session.cookie.expires).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await this.db.sessions.set(sid, session, expires);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.db.sessions.destroy(sid);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }
}

module.exports = SupabaseSessionStore;
