const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://eykguplyjsfquxbpelrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5a2d1cGx5anNmcXV4YnBlbHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjQ0NTQsImV4cCI6MjA5OTYwMDQ1NH0.2mEI9XfAV0WdLjXajU-FWRQ36zEzFmRhxEZvnUdCS6U';

const supabase = createClient(supabaseUrl, supabaseKey);

const db = {
  users: {
    async findByUsername(username) {
      const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
      return data;
    },
    async findById(id) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      return data;
    },
    async count() {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      return count || 0;
    },
    async create(username, password, fullName, role) {
      const { data, error } = await supabase.from('users').insert({
        username, password, full_name: fullName, role: role || 'worker'
      }).select().single();
      if (error) throw error;
      return data;
    }
  },

  sales: {
    async getAll(limit = 200) {
      const { data: sales } = await supabase.from('sales').select('*').order('sale_date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
      const { data: users } = await supabase.from('users').select('id, full_name');
      const userMap = {};
      (users || []).forEach(u => userMap[u.id] = u.full_name);
      return (sales || []).map(s => ({ ...s, full_name: userMap[s.user_id] || 'Unknown' }));
    },
    async findById(id) {
      const { data } = await supabase.from('sales').select('*').eq('id', id).single();
      return data;
    },
    async create(userId, product, quantity, unitPrice, totalAmount, saleDate) {
      const { data, error } = await supabase.from('sales').insert({
        user_id: userId, product, quantity, unit_price: unitPrice, total_amount: totalAmount, sale_date: saleDate
      }).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      await supabase.from('sales').delete().eq('id', id);
    },
    async sumByProduct(product, startDate, endDate) {
      const { data } = await supabase.from('sales').select('quantity, total_amount').eq('product', product).gte('sale_date', startDate).lte('sale_date', endDate);
      let total = 0, qty = 0;
      (data || []).forEach(s => { total += Number(s.total_amount); qty += s.quantity; });
      return { total, qty };
    },
    async sumAll(startDate, endDate) {
      const { data } = await supabase.from('sales').select('total_amount').gte('sale_date', startDate).lte('sale_date', endDate);
      return (data || []).reduce((sum, s) => sum + Number(s.total_amount), 0);
    },
    async sumByProductGrouped(product, startDate, endDate) {
      const { data } = await supabase.from('sales').select('sale_date, quantity, total_amount').eq('product', product).gte('sale_date', startDate).lte('sale_date', endDate).order('sale_date');
      const grouped = {};
      (data || []).forEach(s => {
        if (!grouped[s.sale_date]) grouped[s.sale_date] = { sale_date: s.sale_date, qty: 0, total: 0 };
        grouped[s.sale_date].qty += s.quantity;
        grouped[s.sale_date].total += Number(s.total_amount);
      });
      return Object.values(grouped);
    },
    async allInRange(startDate, endDate) {
      const { data: sales } = await supabase.from('sales').select('*').gte('sale_date', startDate).lte('sale_date', endDate).order('sale_date').order('created_at');
      const { data: users } = await supabase.from('users').select('id, full_name');
      const userMap = {};
      (users || []).forEach(u => userMap[u.id] = u.full_name);
      return (sales || []).map(s => ({ ...s, full_name: userMap[s.user_id] || 'Unknown' }));
    },
    async recent(count = 5) {
      const { data: sales } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(count);
      const { data: users } = await supabase.from('users').select('id, full_name');
      const userMap = {};
      (users || []).forEach(u => userMap[u.id] = u.full_name);
      return (sales || []).map(s => ({ ...s, full_name: userMap[s.user_id] || 'Unknown' }));
    }
  },

  sessions: {
    async get(sid) {
      const { data } = await supabase.from('sessions').select('data, expires_at').eq('sid', sid).maybeSingle();
      if (!data) return null;
      if (new Date(data.expires_at) < new Date()) {
        await this.destroy(sid);
        return null;
      }
      return data.data;
    },
    async set(sid, sessionData, expiresAt) {
      await supabase.from('sessions').upsert({ sid, data: sessionData, expires_at: expiresAt });
    },
    async destroy(sid) {
      await supabase.from('sessions').delete().eq('sid', sid);
    },
    async cleanup() {
      await supabase.from('sessions').delete().lt('expires_at', new Date().toISOString());
    }
  }
};

async function initApp() {
  try {
    await db.sessions.cleanup();
  } catch (e) {
    console.log('Session cleanup skipped:', e.message);
  }

  try {
    const userCount = await db.users.count();
    if (userCount === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await db.users.create('admin', hash, 'Administrator', 'admin');
      console.log('Default admin account created');
    }
  } catch (e) {
    console.log('Admin init:', e.message);
  }

  console.log('Database connected to Supabase');
}

module.exports = { db, initApp };
