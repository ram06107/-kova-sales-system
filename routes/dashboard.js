const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // Daily stats
  const dailyYogurt = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(quantity),0) as qty FROM sales WHERE product='yogurt' AND sale_date=?").get(today);
  const dailyTea = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(quantity),0) as qty FROM sales WHERE product='tea' AND sale_date=?").get(today);
  const dailyTotal = dailyYogurt.total + dailyTea.total;

  // Weekly stats (last 7 days)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weeklyYogurt = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(quantity),0) as qty FROM sales WHERE product='yogurt' AND sale_date >= ? AND sale_date <= ?").get(weekStartStr, today);
  const weeklyTea = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(quantity),0) as qty FROM sales WHERE product='tea' AND sale_date >= ? AND sale_date <= ?").get(weekStartStr, today);
  const weeklyTotal = weeklyYogurt.total + weeklyTea.total;

  // Monthly stats
  const monthStart = today.slice(0, 7) + '-01';
  const monthlyYogurt = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(quantity),0) as qty FROM sales WHERE product='yogurt' AND sale_date >= ? AND sale_date <= ?").get(monthStart, today);
  const monthlyTea = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(quantity),0) as qty FROM sales WHERE product='tea' AND sale_date >= ? AND sale_date <= ?").get(monthStart, today);
  const monthlyTotal = monthlyYogurt.total + monthlyTea.total;

  // Yesterday for growth comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayTotal = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total FROM sales WHERE sale_date=?").get(yesterdayStr).total;
  const dailyGrowth = yesterdayTotal > 0 ? ((dailyTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : (dailyTotal > 0 ? 100 : 0);

  // Last week same period for weekly growth comparison
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10);
  const lastWeekTotal = db.prepare("SELECT COALESCE(SUM(total_amount),0) as total FROM sales WHERE sale_date >= ? AND sale_date < ?").get(twoWeeksAgoStr, weekStartStr).total;
  const weeklyGrowth = lastWeekTotal > 0 ? ((weeklyTotal - lastWeekTotal) / lastWeekTotal * 100).toFixed(1) : (weeklyTotal > 0 ? 100 : 0);

  // Daily chart data (last 7 days)
  const chartLabels = [];
  const chartYogurt = [];
  const chartTea = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    chartLabels.push(d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
    chartYogurt.push(db.prepare("SELECT COALESCE(SUM(total_amount),0) as t FROM sales WHERE product='yogurt' AND sale_date=?").get(ds).t);
    chartTea.push(db.prepare("SELECT COALESCE(SUM(total_amount),0) as t FROM sales WHERE product='tea' AND sale_date=?").get(ds).t);
  }

  // Recent sales
  const recentSales = db.prepare('SELECT s.*, u.full_name FROM sales s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 5').all();

  res.render('dashboard', {
    user: req.session,
    daily: { yogurt: dailyYogurt, tea: dailyTea, total: dailyTotal, growth: dailyGrowth },
    weekly: { yogurt: weeklyYogurt, tea: weeklyTea, total: weeklyTotal, growth: weeklyGrowth },
    monthly: { yogurt: monthlyYogurt, tea: monthlyTea, total: monthlyTotal },
    chart: { labels: chartLabels, yogurt: chartYogurt, tea: chartTea },
    recentSales
  });
});

module.exports = router;
