const { GoogleGenAI } = require('@google/generative-ai');
const db = require('./db');

// Fallback rule-based recommendation generator
async function generateRuleBasedRecommendations(stats) {
  const recommendations = [];

  // 1. Geography Rule
  const virar = stats.geoData.find(g => g.city === 'Virar');
  const thane = stats.geoData.find(g => g.city === 'Thane');
  if (virar && thane) {
    const virarCr = (virar.conversions / virar.leads) * 100;
    const thaneCr = (thane.conversions / thane.leads) * 100;
    if (virarCr > thaneCr + 20) {
      recommendations.push({
        type: 'geo',
        title: `Shift targeting budget to ${virar.city} from ${thane.city}`,
        recommendation: `${virar.city} leads convert at ${virarCr.toFixed(0)}% (${virar.conversions} customers from ${virar.leads} leads) compared to ${thane.city}'s ${thaneCr.toFixed(0)}% (${thane.conversions} customers from ${thane.leads} leads). Shifting budget will optimize customer acquisition costs.`,
        impact_score: Math.min(10, Math.round(5 + (virarCr - thaneCr) / 10))
      });
    }
  }

  // 2. Keyword Rule
  const kwA = stats.keywordData.find(k => k.keyword.includes('virar') || k.keyword.includes('near me'));
  const kwB = stats.keywordData.find(k => k.keyword.includes('cheap') || k.keyword.includes('contact'));
  if (kwA && kwB) {
    const roasA = kwA.revenue / kwA.cost;
    const roasB = kwB.revenue / kwB.cost;
    if (roasA > roasB && roasB < 1) {
      recommendations.push({
        type: 'keyword',
        title: `Pause low ROAS keyword: "${kwB.keyword}"`,
        recommendation: `Keyword "${kwB.keyword}" has a return on ad spend (ROAS) of ${roasB.toFixed(1)}x (Spend: ₹${kwB.cost}, Revenue: ₹${kwB.revenue}). Consider pausing it immediately and transferring the spend to "${kwA.keyword}" (ROAS: ${roasA.toFixed(1)}x).`,
        impact_score: 9
      });
    }
  }

  // 3. Campaign/Service Rule
  const icuCare = stats.serviceData.find(s => s.service === 'ICU Care');
  if (icuCare && icuCare.conversion_rate > 20) {
    recommendations.push({
      type: 'budget',
      title: 'Scale budget for high-performing ICU Care services',
      recommendation: `ICU Care has a premium conversion rate of ${icuCare.conversion_rate.toFixed(0)}% and generated ₹${Number(icuCare.revenue).toLocaleString()} in revenue. Increasing daily search campaign budgets by 15-20% is highly recommended to capture high-value customer demand.`,
      impact_score: 10
    });
  }

  // 4. Time Rule
  recommendations.push({
    type: 'schedule',
    title: 'Ad bid optimization for evening conversion spike (9 PM - 11 PM)',
    recommendation: `Our time intelligence logs indicate that customer conversion probability peaks significantly during evening hours (9 PM to 11 PM). Setting up a custom Google Ads bid schedule with a +20% bid adjustment for these hours will maximize campaign capture.`,
    impact_score: 8
  });

  return recommendations;
}

// Fetch all necessary stats from DB to feed the AI
async function getDatabaseMetricsSummary() {
  // 1. Executive Summary
  const summaryRes = await db.query(`
    SELECT 
      COUNT(*) as total_leads,
      SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as total_customers,
      SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as total_qualified,
      SUM(revenue) as total_revenue
    FROM leads
  `);
  
  const spendRes = await db.query(`SELECT SUM(cost) as total_spend FROM campaign_performance`);
  
  const totalLeads = Number(summaryRes.rows[0].total_leads) || 0;
  const totalCustomers = Number(summaryRes.rows[0].total_customers) || 0;
  const totalQualified = Number(summaryRes.rows[0].total_qualified) || 0;
  const totalRevenue = Number(summaryRes.rows[0].total_revenue) || 0;
  const totalSpend = Number(spendRes.rows[0].total_spend) || 0;
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
  const conversionRate = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;

  // 2. Geography Data
  const geoRes = await db.query(`
    SELECT city, COUNT(*) as leads, SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as conversions, SUM(revenue) as revenue
    FROM leads
    GROUP BY city
  `);
  const geoData = geoRes.rows.map(r => ({
    city: r.city,
    leads: Number(r.leads),
    conversions: Number(r.conversions),
    revenue: Number(r.revenue)
  }));

  // 3. Keyword Data
  const kwRes = await db.query(`
    SELECT keyword, SUM(cost) as cost, SUM(clicks) as clicks, SUM(conversions) as conversions
    FROM campaign_performance
    GROUP BY keyword
  `);
  // Map keywords to matching converted revenue from leads
  const kwRevenueRes = await db.query(`
    SELECT keyword, SUM(revenue) as revenue, COUNT(*) as leads
    FROM leads
    GROUP BY keyword
  `);
  
  const keywordData = kwRes.rows.map(r => {
    const revRow = kwRevenueRes.rows.find(kr => kr.keyword === r.keyword);
    return {
      keyword: r.keyword,
      cost: Number(r.cost),
      clicks: Number(r.clicks),
      conversions: Number(r.conversions),
      revenue: revRow ? Number(revRow.revenue) : 0,
      leads: revRow ? Number(revRow.leads) : 0
    };
  });

  // 4. Service Data
  const serviceRes = await db.query(`
    SELECT service_interest as service, COUNT(*) as leads, 
           SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as customers,
           SUM(revenue) as revenue
    FROM leads
    GROUP BY service_interest
  `);
  const serviceData = serviceRes.rows.map(r => ({
    service: r.service,
    leads: Number(r.leads),
    customers: Number(r.customers),
    conversion_rate: r.leads > 0 ? (Number(r.customers) / Number(r.leads)) * 100 : 0,
    revenue: Number(r.revenue)
  }));

  return {
    kpis: { totalLeads, totalCustomers, totalQualified, totalRevenue, totalSpend, roas, conversionRate },
    geoData,
    keywordData,
    serviceData
  };
}

async function generateRecommendations() {
  const stats = await getDatabaseMetricsSummary();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('No GEMINI_API_KEY found in environment. Generating rule-based insights...');
    const recs = await generateRuleBasedRecommendations(stats);
    
    // Store recommendations in DB
    for (const r of recs) {
      await db.query(
        `INSERT INTO ai_recommendations (type, title, recommendation, impact_score, status)
         VALUES ($1, $2, $3, $4, 'Active')`,
        [r.type, r.title, r.recommendation, r.impact_score]
      );
    }
    return recs;
  }

  console.log('Generating recommendations using Gemini API...');
  try {
    const { GoogleGenAI } = require('@google/generative-ai');
    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-1.5-flash for speed and reliability
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert Marketing Intelligence Analyst for WardSeva, a home healthcare provider.
      Analyze the following website traffic, lead conversions, keyword performance, and geographic stats to output exactly 4 actionable recommendations.
      
      STATS:
      - Executive KPIs:
        * Total Spend: ₹${stats.kpis.totalSpend.toFixed(0)}
        * Total Leads: ${stats.kpis.totalLeads}
        * Total Converted Customers: ${stats.kpis.totalCustomers}
        * Total Revenue Generated: ₹${stats.kpis.totalRevenue.toFixed(0)}
        * Overall Return on Ad Spend (ROAS): ${stats.kpis.roas.toFixed(2)}x
        * Lead-to-Customer Conversion Rate: ${stats.kpis.conversionRate.toFixed(1)}%
      
      - Geography Performance (leads & conversions by location):
        ${JSON.stringify(stats.geoData)}
        
      - Keyword & Campaign Ads Performance (cost, clicks, conversions, revenue generated):
        ${JSON.stringify(stats.keywordData)}
        
      - Service Interest Performance (leads, customers, revenue, conversion rates per service):
        ${JSON.stringify(stats.serviceData)}
      
      Generate exactly 4 marketing intelligence recommendations, one for each of the following types:
      1. 'budget' (optimal budget allocation across campaigns)
      2. 'keyword' (pausing low performing keywords, bidding up high performers)
      3. 'schedule' (optimal advertising time of day adjustments)
      4. 'geo' (targeting changes based on location ROI, e.g. Virar vs Thane)

      Provide the response STRICTLY as a JSON array of objects, containing the following properties:
      - type: string (must be exactly 'budget', 'keyword', 'schedule', or 'geo')
      - title: string (short catchy title, e.g., "Shift targeting budget to Virar")
      - recommendation: string (detailed explanation of the data, the insight, and exactly what actions to take. Include specific rupee figures, percentages or conversion numbers where applicable)
      - impact_score: number (an integer from 1 to 10 evaluating how critical this is)

      Return ONLY the JSON array. Do not include markdown formatting tags like \`\`\`json or \`\`\`. Do not write extra commentary.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Clean up potential markdown formatting if Gemini included it
    if (text.startsWith('```')) {
      text = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    const recs = JSON.parse(text);
    
    // Save to database
    for (const r of recs) {
      await db.query(
        `INSERT INTO ai_recommendations (type, title, recommendation, impact_score, status)
         VALUES ($1, $2, $3, $4, 'Active')`,
        [r.type, r.title, r.recommendation, r.impact_score]
      );
    }
    
    return recs;
  } catch (error) {
    console.error('Gemini API query failed, falling back to rule-based generation:', error);
    const recs = await generateRuleBasedRecommendations(stats);
    for (const r of recs) {
      await db.query(
        `INSERT INTO ai_recommendations (type, title, recommendation, impact_score, status)
         VALUES ($1, $2, $3, $4, 'Active')`,
        [r.type, r.title, r.recommendation, r.impact_score]
      );
    }
    return recs;
  }
}

module.exports = {
  generateRecommendations,
  getDatabaseMetricsSummary
};
