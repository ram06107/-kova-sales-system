const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = process.env.RENDER ? '/tmp' : __dirname;
const DB_FILE = path.join(DB_DIR, 'kova_data.json');

let data = { users: [], sales: [], sessions: [], _ids: { users: 0, sales: 0 } };

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load database, starting fresh:', e.message);
    data = { users: [], sales: [], sessions: [], _ids: { users: 0, sales: 0 } };
  }
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 0));
  } catch (e) {
    console.error('Failed to save database:', e.message);
  }
}

function nextId(table) {
  data._ids[table] = (data._ids[table] || 0) + 1;
  return data._ids[table];
}

const db = {
  users: {
    findByUsername(username) {
      return data.users.find(u => u.username === username) || null;
    },
    findById(id) {
      return data.users.find(u => u.id === id) || null;
    },
    count() {
      return data.users.length;
    },
    create(username, password, fullName, role) {
      const user = {
        id: nextId('users'),
        username,
        password,
        full_name: fullName,
        role: role || 'worker',
        created_at: new Date().toISOString()
      };
      data.users.push(user);
      save();
      return user;
    }
  },
  sales: {
    getAll(limit = 200) {
      return data.sales
        .sort((a, b) => (b.sale_date + b.created_at).localeCompare(a.sale_date + a.created_at))
        .slice(0, limit)
        .map(s => {
          const user = data.users.find(u => u.id === s.user_id);
          return { ...s, full_name: user ? user.full_name : 'Unknown' };
        });
    },
    findById(id) {
      return data.sales.find(s => s.id === id) || null;
    },
    create(userId, product, quantity, unitPrice, totalAmount, saleDate) {
      const sale = {
        id: nextId('sales'),
        user_id: userId,
        product,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        sale_date: saleDate,
        created_at: new Date().toISOString()
      };
      data.sales.push(sale);
      save();
      return sale;
    },
    delete(id) {
      data.sales = data.sales.filter(s => s.id !== id);
      save();
    },
    sumByProduct(product, startDate, endDate) {
      const filtered = data.sales.filter(s =>
        s.product === product && s.sale_date >= startDate && s.sale_date <= endDate
      );
      const total = filtered.reduce((sum, s) => sum + s.total_amount, 0);
      const qty = filtered.reduce((sum, s) => sum + s.quantity, 0);
      return { total, qty };
    },
    sumAll(startDate, endDate) {
      const filtered = data.sales.filter(s =>
        s.sale_date >= startDate && s.sale_date <= endDate
      );
      return filtered.reduce((sum, s) => sum + s.total_amount, 0);
    },
    sumByProductGrouped(product, startDate, endDate) {
      return data.sales
        .filter(s => s.product === product && s.sale_date >= startDate && s.sale_date <= endDate)
        .reduce((acc, s) => {
          const existing = acc.find(r => r.sale_date === s.sale_date);
          if (existing) {
            existing.qty += s.quantity;
            existing.total += s.total_amount;
          } else {
            acc.push({ sale_date: s.sale_date, qty: s.quantity, total: s.total_amount });
          }
          return acc;
        }, [])
        .sort((a, b) => a.sale_date.localeCompare(b.sale_date));
    },
    allInRange(startDate, endDate) {
      return data.sales
        .filter(s => s.sale_date >= startDate && s.sale_date <= endDate)
        .sort((a, b) => (a.sale_date + a.created_at).localeCompare(b.sale_date + b.created_at))
        .map(s => {
          const user = data.users.find(u => u.id === s.user_id);
          return { ...s, full_name: user ? user.full_name : 'Unknown' };
        });
    },
    recent(count = 5) {
      return data.sales
        .sort((a, b) => (b.created_at).localeCompare(a.created_at))
        .slice(0, count)
        .map(s => {
          const user = data.users.find(u => u.id === s.user_id);
          return { ...s, full_name: user ? user.full_name : 'Unknown' };
        });
    }
  },
  sessions: {
    get(sid) {
      const s = data.sessions.find(x => x.sid === sid);
      if (!s) return null;
      if (new Date(s.expires_at) < new Date()) {
        this.destroy(sid);
        return null;
      }
      return JSON.parse(s.data);
    },
    set(sid, sessionData, expiresAt) {
      const idx = data.sessions.findIndex(x => x.sid === sid);
      const entry = { sid, data: JSON.stringify(sessionData), expires_at: expiresAt };
      if (idx >= 0) {
        data.sessions[idx] = entry;
      } else {
        data.sessions.push(entry);
      }
      save();
    },
    destroy(sid) {
      data.sessions = data.sessions.filter(x => x.sid !== sid);
      save();
    },
    cleanup() {
      const now = new Date().toISOString();
      data.sessions = data.sessions.filter(x => x.expires_at > now);
      save();
    }
  }
};

function initApp() {
  load();
  db.sessions.cleanup();

  if (db.users.count() === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.users.create('admin', hash, 'Administrator', 'admin');
    console.log('Default admin account created — Username: admin / Password: admin123');
  }

  console.log('Database ready at:', DB_FILE);
}

module.exports = { db, initApp };
