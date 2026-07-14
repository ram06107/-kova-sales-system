const Store = require('express-session').Store;

class SupabaseSessionStore extends Store {
  constructor(db) {
    super();
    this.db = db;
  }

  get(sid, callback) {
    this.db.sessions.get(sid)
      .then(session => callback(null, session))
      .catch(err => callback(err));
  }

  set(sid, session, callback) {
    const expires = session.cookie && session.cookie.expires
      ? new Date(session.cookie.expires).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    this.db.sessions.set(sid, session, expires)
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  destroy(sid, callback) {
    this.db.sessions.destroy(sid)
      .then(() => callback(null))
      .catch(err => callback(err));
  }
}

module.exports = SupabaseSessionStore;
