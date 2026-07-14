const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const monthStart = today.slice(0, 7) + '-01';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10);

  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0);
  const lastMonthEndStr = lastMonthEnd.toISOString().slice(0, 10);
  const lastMonthStart = lastMonthEndStr.slice(0, 7) + '-01';

  const allDaily = await db.sales.getDailyRange(weekStartStr, today);

  function sumRange(data, start, end, product) {
    return data.filter(s => s.sale_date >= start && s.sale_date <= end && (!product || s.product === product))
      .reduce((acc, s) => ({ total: acc.total + Number(s.total_amount), qty: acc.qty + s.quantity }), { total: 0, qty: 0 });
  }

  const dailyYogurt = sumRange(allDaily, today, today, 'yogurt');
  const dailyTea = sumRange(allDaily, today, today, 'tea');
  const dailyTotal = dailyYogurt.total + dailyTea.total;

  const weeklyYogurt = sumRange(allDaily, weekStartStr, today, 'yogurt');
  const weeklyTea = sumRange(allDaily, weekStartStr, today, 'tea');
  const weeklyTotal = weeklyYogurt.total + weeklyTea.total;

  const monthlyAll = await db.sales.getDailyRange(monthStart, today);
  const monthlyYogurt = sumRange(monthlyAll, monthStart, today, 'yogurt');
  const monthlyTea = sumRange(monthlyAll, monthStart, today, 'tea');
  const monthlyTotal = monthlyYogurt.total + monthlyTea.total;

  const lastMonthAll = await db.sales.getDailyRange(lastMonthStart, lastMonthEndStr);
  const lastMonthYogurt = sumRange(lastMonthAll, lastMonthStart, lastMonthEndStr, 'yogurt');
  const lastMonthTea = sumRange(lastMonthAll, lastMonthStart, lastMonthEndStr, 'tea');
  const lastMonthTotal = lastMonthYogurt.total + lastMonthTea.total;

  const yesterdayTotal = sumRange(allDaily, yesterdayStr, yesterdayStr, null).total + sumRange(allDaily, yesterdayStr, yesterdayStr, null).total;
  const dailyGrowth = yesterdayTotal > 0 ? ((dailyTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : (dailyTotal > 0 ? 100 : 0);

  const lastWeekTotal = sumRange(allDaily, twoWeeksAgoStr, weekStartStr, null).total;
  const weeklyGrowth = lastWeekTotal > 0 ? ((weeklyTotal - lastWeekTotal) / lastWeekTotal * 100).toFixed(1) : (weeklyTotal > 0 ? 100 : 0);

  const monthlyGrowth = lastMonthTotal > 0 ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : (monthlyTotal > 0 ? 100 : 0);

  const chartLabels = [];
  const chartYogurt = [];
  const chartTea = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    chartLabels.push(d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
    chartYogurt.push(sumRange(allDaily, ds, ds, 'yogurt').total);
    chartTea.push(sumRange(allDaily, ds, ds, 'tea').total);
  }

  const recentSales = await db.sales.recent(5);
  const stockRemaining = await db.stock.totalRemaining();
  const stockTotal = await db.stock.totalStocked();

  res.render('dashboard', {
    user: req.session,
    daily: { yogurt: dailyYogurt, tea: dailyTea, total: dailyTotal, growth: dailyGrowth },
    weekly: { yogurt: weeklyYogurt, tea: weeklyTea, total: weeklyTotal, growth: weeklyGrowth },
    monthly: { yogurt: monthlyYogurt, tea: monthlyTea, total: monthlyTotal, growth: monthlyGrowth, lastMonthTotal },
    chart: { labels: chartLabels, yogurt: chartYogurt, tea: chartTea },
    recentSales,
    stock: { remaining: stockRemaining, total: stockTotal }
  });
});

module.exports = router;
