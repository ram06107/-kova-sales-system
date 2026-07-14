const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const dailyYogurt = await db.sales.sumByProduct('yogurt', today, today);
  const dailyTea = await db.sales.sumByProduct('tea', today, today);
  const dailyTotal = dailyYogurt.total + dailyTea.total;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weeklyYogurt = await db.sales.sumByProduct('yogurt', weekStartStr, today);
  const weeklyTea = await db.sales.sumByProduct('tea', weekStartStr, today);
  const weeklyTotal = weeklyYogurt.total + weeklyTea.total;

  const monthStart = today.slice(0, 7) + '-01';
  const monthlyYogurt = await db.sales.sumByProduct('yogurt', monthStart, today);
  const monthlyTea = await db.sales.sumByProduct('tea', monthStart, today);
  const monthlyTotal = monthlyYogurt.total + monthlyTea.total;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayTotal = await db.sales.sumAll(yesterdayStr, yesterdayStr);
  const dailyGrowth = yesterdayTotal > 0 ? ((dailyTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : (dailyTotal > 0 ? 100 : 0);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10);
  const lastWeekTotal = await db.sales.sumAll(twoWeeksAgoStr, weekStartStr);
  const weeklyGrowth = lastWeekTotal > 0 ? ((weeklyTotal - lastWeekTotal) / lastWeekTotal * 100).toFixed(1) : (weeklyTotal > 0 ? 100 : 0);

  const chartLabels = [];
  const chartYogurt = [];
  const chartTea = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    chartLabels.push(d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
    const yData = await db.sales.sumByProduct('yogurt', ds, ds);
    const tData = await db.sales.sumByProduct('tea', ds, ds);
    chartYogurt.push(yData.total);
    chartTea.push(tData.total);
  }

  const recentSales = await db.sales.recent(5);

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
