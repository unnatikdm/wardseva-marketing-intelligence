const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const aiService = require('./aiService');

const JWT_SECRET = process.env.JWT_SECRET || 'wardseva_super_secret_key_123';

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// 1. Auth Endpoint
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Summary Endpoint (Executive KPIs)
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const leadQuery = `
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as total_customers,
        SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as total_qualified,
        SUM(revenue) as total_revenue
      FROM leads
    `;
    const spendQuery = `SELECT SUM(cost) as total_spend FROM campaign_performance`;
    
    const leadStats = await db.query(leadQuery);
    const spendStats = await db.query(spendQuery);

    const totalLeads = Number(leadStats.rows[0].total_leads) || 0;
    const totalCustomers = Number(leadStats.rows[0].total_customers) || 0;
    const totalQualified = Number(leadStats.rows[0].total_qualified) || 0;
    const totalRevenue = Number(leadStats.rows[0].total_revenue) || 0;
    const totalSpend = Number(spendStats.rows[0].total_spend) || 0;

    const conversionRate = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Daily conversions chart data (last 14 days)
    const dailyConversionsQuery = `
      SELECT 
        date(submission_time) as date,
        COUNT(*) as leads,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as conversions
      FROM leads
      WHERE submission_time >= date('now', '-14 days')
      GROUP BY date(submission_time)
      ORDER BY date ASC
    `;
    const dailyConversions = await db.query(dailyConversionsQuery);

    const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_REFRESH_TOKEN } = process.env;
    const isPlaceholder = (val) => !val || val.includes('your_') || val.includes('XXX-') || val.trim() === '';
    const isDemo = isPlaceholder(GOOGLE_ADS_CLIENT_ID) || isPlaceholder(GOOGLE_ADS_REFRESH_TOKEN);

    res.json({
      kpis: {
        totalLeads,
        totalCustomers,
        totalQualified,
        totalRevenue,
        totalSpend,
        conversionRate,
        roas
      },
      dailyChart: dailyConversions.rows,
      isDemo
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Customer Behavior Endpoint
router.get('/dashboard/behavior', authenticateToken, async (req, res) => {
  try {
    const devices = await db.query(`
      SELECT device_type as device, COUNT(*) as count 
      FROM visitors 
      GROUP BY device_type
    `);
    const sources = await db.query(`
      SELECT traffic_source as source, COUNT(*) as count 
      FROM visitors 
      GROUP BY traffic_source
    `);
    const browser = await db.query(`
      SELECT browser, COUNT(*) as count 
      FROM visitors 
      GROUP BY browser
    `);
    
    // Visitor Activity Timeline (sessions over the last 15 days)
    const timeline = await db.query(`
      SELECT date(created_at) as date, COUNT(*) as sessions, SUM(pages_visited) as pageviews
      FROM visitors
      WHERE created_at >= date('now', '-15 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);

    // Simulated landing page click heatmaps (based on visitor stats)
    const pageclicks = await db.query(`
      SELECT landing_page as path, COUNT(*) as clicks, AVG(time_spent) as avg_time
      FROM visitors
      GROUP BY landing_page
    `);

    res.json({
      deviceDistribution: devices.rows,
      trafficSources: sources.rows,
      browserDistribution: browser.rows,
      timeline: timeline.rows,
      heatmapData: pageclicks.rows
    });
  } catch (error) {
    console.error('Behavior error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. Conversion Funnel Endpoint
router.get('/dashboard/funnel', authenticateToken, async (req, res) => {
  try {
    // Visitor -> Lead -> Qualified -> Customer
    const visitorCount = await db.query(`SELECT COUNT(*) as count FROM visitors`);
    const leadCount = await db.query(`SELECT COUNT(*) as count FROM leads`);
    const qualifiedCount = await db.query(`SELECT COUNT(*) as count FROM leads WHERE status IN ('Qualified', 'Converted')`);
    const customerCount = await db.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'Converted'`);

    const visitors = Number(visitorCount.rows[0].count) || 0;
    const leads = Number(leadCount.rows[0].count) || 0;
    const qualified = Number(qualifiedCount.rows[0].count) || 0;
    const customers = Number(customerCount.rows[0].count) || 0;

    const funnelData = [
      { name: 'Visitors', value: visitors, rate: 100 },
      { name: 'Leads', value: leads, rate: visitors > 0 ? (leads / visitors) * 100 : 0 },
      { name: 'Qualified Leads', value: qualified, rate: leads > 0 ? (qualified / leads) * 100 : 0 },
      { name: 'Customers', value: customers, rate: qualified > 0 ? (customers / qualified) * 100 : 0 }
    ];

    res.json(funnelData);
  } catch (error) {
    console.error('Funnel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. Keyword Intelligence Endpoint
router.get('/dashboard/keywords', authenticateToken, async (req, res) => {
  try {
    // Group campaigns and cost
    const kwAdPerformance = await db.query(`
      SELECT keyword, campaign_name as campaign, SUM(cost) as spend, SUM(clicks) as clicks
      FROM campaign_performance
      GROUP BY keyword
    `);
    
    // Group leads and revenue
    const kwLeads = await db.query(`
      SELECT keyword, COUNT(*) as leads, 
             SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as customers,
             SUM(revenue) as revenue
      FROM leads
      GROUP BY keyword
    `);

    // Match them
    const result = kwAdPerformance.rows.map(perf => {
      const match = kwLeads.rows.find(l => l.keyword === perf.keyword);
      const leads = match ? Number(match.leads) : 0;
      const customers = match ? Number(match.customers) : 0;
      const revenue = match ? Number(match.revenue) : 0;
      const spend = Number(perf.spend);
      const clicks = Number(perf.clicks);

      return {
        keyword: perf.keyword,
        campaign: perf.campaign,
        spend,
        clicks,
        leads,
        customers,
        revenue,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpl: leads > 0 ? spend / leads : 0,
        cpcust: customers > 0 ? spend / customers : 0,
        roas: spend > 0 ? revenue / spend : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Keyword intelligence error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Campaign Intelligence Endpoint
router.get('/dashboard/campaigns', authenticateToken, async (req, res) => {
  try {
    const cpAdPerformance = await db.query(`
      SELECT campaign_name as campaign, SUM(cost) as spend, SUM(clicks) as clicks, SUM(conversions) as ad_conversions
      FROM campaign_performance
      GROUP BY campaign_name
    `);
    
    const cpLeads = await db.query(`
      SELECT campaign_source, COUNT(*) as leads,
             SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as customers,
             SUM(revenue) as revenue
      FROM leads
      GROUP BY campaign_source
    `);

    const result = cpAdPerformance.rows.map(perf => {
      // leads are matched on campaigns. campaign_source in leads is e.g. "Google Ads - ICU Care"
      // perf.campaign is "ICU Care"
      const match = cpLeads.rows.find(l => l.campaign_source.includes(perf.campaign));
      const leads = match ? Number(match.leads) : 0;
      const customers = match ? Number(match.customers) : 0;
      const revenue = match ? Number(match.revenue) : 0;
      const spend = Number(perf.spend);
      const clicks = Number(perf.clicks);

      return {
        campaign: perf.campaign,
        spend,
        clicks,
        leads,
        customers,
        revenue,
        cpl: leads > 0 ? spend / leads : 0,
        cpcust: customers > 0 ? spend / customers : 0,
        roas: spend > 0 ? revenue / spend : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Campaign error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. Service Intelligence Endpoint
router.get('/dashboard/services', authenticateToken, async (req, res) => {
  try {
    const serviceStats = await db.query(`
      SELECT 
        service_interest as service,
        COUNT(*) as leads,
        SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as customers,
        SUM(revenue) as revenue
      FROM leads
      GROUP BY service_interest
    `);

    const formatted = serviceStats.rows.map(row => {
      const leads = Number(row.leads);
      const customers = Number(row.customers);
      const revenue = Number(row.revenue);
      const cr = leads > 0 ? (customers / leads) * 100 : 0;
      
      // Calculate estimated margins
      // Services like Equipment rental have lower margins (e.g. 50%), ICU care has higher margins (e.g. 65%)
      let margin = 0.60;
      if (row.service === 'ICU Care') margin = 0.65;
      if (row.service === 'Medical Equipment Rental') margin = 0.45;
      if (row.service === 'Caregiver Services') margin = 0.55;

      return {
        service: row.service,
        leads,
        qualified: Number(row.qualified),
        customers,
        revenue,
        conversion_rate: cr,
        profit: revenue * margin
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Service intelligence error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. Time Intelligence Endpoint
router.get('/dashboard/time', authenticateToken, async (req, res) => {
  try {
    // Hourly performance (leads and conversions based on time of day)
    // In SQLite we can extract hour using strftime('%H', submission_time)
    // In PG we can use EXTRACT(HOUR FROM submission_time)
    let hourQuery;
    if (db.isPostgres) {
      hourQuery = `
        SELECT 
          EXTRACT(HOUR FROM submission_time) as hour,
          COUNT(*) as leads,
          SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as conversions
        FROM leads
        GROUP BY EXTRACT(HOUR FROM submission_time)
        ORDER BY hour ASC
      `;
    } else {
      hourQuery = `
        SELECT 
          CAST(strftime('%H', submission_time) as INTEGER) as hour,
          COUNT(*) as leads,
          SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as conversions
        FROM leads
        GROUP BY strftime('%H', submission_time)
        ORDER BY hour ASC
      `;
    }

    // Daily conversions
    let dayQuery;
    if (db.isPostgres) {
      dayQuery = `
        SELECT 
          TO_CHAR(submission_time, 'Day') as day_name,
          EXTRACT(ISODOW FROM submission_time) as day_index,
          COUNT(*) as leads,
          SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as conversions
        FROM leads
        GROUP BY TO_CHAR(submission_time, 'Day'), EXTRACT(ISODOW FROM submission_time)
        ORDER BY day_index ASC
      `;
    } else {
      dayQuery = `
        SELECT 
          CASE strftime('%w', submission_time)
            WHEN '0' THEN 'Sunday'
            WHEN '1' THEN 'Monday'
            WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday'
            WHEN '4' THEN 'Thursday'
            WHEN '5' THEN 'Friday'
            WHEN '6' THEN 'Saturday'
          END as day_name,
          strftime('%w', submission_time) as day_index,
          COUNT(*) as leads,
          SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as conversions
        FROM leads
        GROUP BY day_index
        ORDER BY day_index ASC
      `;
    }

    const hours = await db.query(hourQuery);
    const days = await db.query(dayQuery);

    res.json({
      hourly: hours.rows,
      daily: days.rows
    });
  } catch (error) {
    console.error('Time intelligence error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 9. Geographic Intelligence Endpoint
router.get('/dashboard/geo', authenticateToken, async (req, res) => {
  try {
    const geoQuery = `
      SELECT 
        city,
        COUNT(*) as leads,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as customers,
        SUM(revenue) as revenue
      FROM leads
      GROUP BY city
      ORDER BY revenue DESC
    `;
    const result = await db.query(geoQuery);

    const formatted = result.rows.map(row => {
      const leads = Number(row.leads);
      const customers = Number(row.customers);
      return {
        city: row.city,
        leads,
        customers,
        revenue: Number(row.revenue) || 0,
        conversion_rate: leads > 0 ? (customers / leads) * 100 : 0
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Geographic intelligence error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 10. Get Recommendations
router.get('/dashboard/recommendations', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM ai_recommendations 
      ORDER BY status ASC, impact_score DESC, created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 11. Generate New AI Recommendations
router.post('/dashboard/recommendations/generate', authenticateToken, async (req, res) => {
  try {
    // Delete existing Active recommendations to regenerate fresh ones
    await db.query(`DELETE FROM ai_recommendations WHERE status = 'Active'`);
    const newRecs = await aiService.generateRecommendations();
    res.json({ message: 'Fresh recommendations generated successfully!', recommendations: newRecs });
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

// 12. Apply Recommendation
router.post('/dashboard/recommendations/:id/apply', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`UPDATE ai_recommendations SET status = 'Applied' WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json({ message: 'Recommendation marked as Applied successfully' });
  } catch (error) {
    console.error('Apply recommendation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 13. Dismiss Recommendation
router.post('/dashboard/recommendations/:id/dismiss', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`UPDATE ai_recommendations SET status = 'Dismissed' WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json({ message: 'Recommendation dismissed successfully' });
  } catch (error) {
    console.error('Dismiss recommendation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
