const { EventEmitter } = require('events');

class JSONSessionStore extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
  }

  get(sid, callback) {
    try {
      const session = this.db.sessions.get(sid);
      callback(null, session);
    } catch (e) {
      callback(e);
    }
  }

  set(sid, session, callback) {
    try {
      const expires = session.cookie && session.cookie.expires
        ? new Date(session.cookie.expires).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      this.db.sessions.set(sid, session, expires);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  destroy(sid, callback) {
    try {
      this.db.sessions.destroy(sid);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }
}

module.exports = JSONSessionStore;
