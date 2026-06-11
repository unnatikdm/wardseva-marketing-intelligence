const db = require('./db');
const bcrypt = require('bcryptjs');

// Helper to generate a random number within a range
const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a date relative to now
const getDateDaysAgo = (daysAgo, hourOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  if (hourOffset) {
    date.setHours(hourOffset, randomRange(0, 59), randomRange(0, 59));
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

async function seedData() {
  try {
    // 1. Initialize tables
    await db.initDatabase();

    // Start transaction for high performance insertions
    await db.exec('BEGIN TRANSACTION;');

    // 2. Clear existing data
    console.log('Clearing old database tables...');
    await db.exec('DELETE FROM users;');
    await db.exec('DELETE FROM visitors;');
    await db.exec('DELETE FROM leads;');
    await db.exec('DELETE FROM campaign_performance;');
    await db.exec('DELETE FROM ai_recommendations;');

    // 3. Create Admin User
    console.log('Seeding admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      ['admin', hashedPassword, 'admin']
    );
    console.log('Admin user created successfully (username: admin, password: admin123).');

    // 4. Seed Campaign Performance Data (Google Ads Keyword level over last 30 days)
    console.log('Seeding campaign performance...');
    const keywords = [
      { name: 'icu care service virar', campaign: 'ICU Care', group: 'ICU Virar', costPerClick: 35, conversionChance: 0.25 },
      { name: 'home icu setup mumbai', campaign: 'ICU Care', group: 'ICU Generic', costPerClick: 50, conversionChance: 0.15 },
      { name: 'home nursing services thane', campaign: 'Home Nursing', group: 'Nursing Thane', costPerClick: 22, conversionChance: 0.08 },
      { name: 'cheap caregiver mumbai', campaign: 'Caregiver Services', group: 'Caregiver LowCost', costPerClick: 18, conversionChance: 0.02 },
      { name: 'ward boy contact list', campaign: 'Ward Boy Services', group: 'Ward Boy Generic', costPerClick: 12, conversionChance: 0.03 },
      { name: 'medical equipment rental online', campaign: 'Equipment Rental', group: 'Rental Generic', costPerClick: 25, conversionChance: 0.10 },
      { name: 'icu bed rental near me', campaign: 'Equipment Rental', group: 'ICU Bed Rental', costPerClick: 45, conversionChance: 0.18 }
    ];

    for (let day = 30; day >= 1; day--) {
      const recordedDate = new Date();
      recordedDate.setDate(recordedDate.getDate() - day);
      const dateStr = recordedDate.toISOString().slice(0, 10);

      for (const kw of keywords) {
        // Daily variation
        const clicks = randomRange(10, 80);
        const cost = clicks * kw.costPerClick * (1 + (randomRange(-15, 15) / 100)); // +/- 15% variation
        const conversions = Math.round(clicks * kw.conversionChance * (1 + (randomRange(-20, 20) / 100)));

        await db.query(
          `INSERT INTO campaign_performance (campaign_name, ad_group, keyword, cost, clicks, conversions, recorded_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [kw.campaign, kw.group, kw.name, cost.toFixed(2), clicks, conversions, dateStr]
        );
      }
    }

    // 5. Seed Visitors (Representing Session level data)
    console.log('Seeding visitors sessions...');
    const devices = ['Mobile', 'Mobile', 'Mobile', 'Desktop', 'Desktop', 'Tablet'];
    const browsers = ['Chrome', 'Chrome', 'Safari', 'Firefox', 'Edge'];
    const cities = ['Virar', 'Thane', 'Mumbai', 'Navi Mumbai', 'Pune'];
    const sources = ['Google Ads', 'Google Search', 'Direct', 'WhatsApp Click', 'Facebook Referral'];
    const landingPages = ['/icu-care', '/home-nursing', '/caregiver-services', '/ward-boy-services', '/equipment-rental'];

    const totalVisitors = 1200;
    for (let i = 0; i < totalVisitors; i++) {
      const visitorId = `v_${randomRange(100000, 999999)}`;
      const sessionId = `s_${randomRange(100000, 999999)}`;
      const device = randomChoice(devices);
      const browser = randomChoice(browsers);
      const source = randomChoice(sources);
      const landing = randomChoice(landingPages);
      
      // Hours distribution: Skewed towards evening (9 PM - 11 PM, i.e., 21, 22)
      let hour;
      const hourRoll = Math.random();
      if (hourRoll < 0.35) {
        hour = randomChoice([21, 22]); // 35% of traffic in 9pm-11pm
      } else if (hourRoll < 0.70) {
        hour = randomRange(9, 18); // 35% in business hours
      } else {
        hour = randomChoice([0, 1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 23]); // 30% others
      }

      const daysAgo = randomRange(0, 30);
      const timestamp = getDateDaysAgo(daysAgo, hour);

      // Geo distribution: Skew Virar vs Thane traffic
      let city = randomChoice(cities);
      if (source === 'Google Ads') {
        city = Math.random() < 0.4 ? 'Virar' : (Math.random() < 0.4 ? 'Thane' : randomChoice(cities));
      }

      const timeSpent = randomRange(10, 450); // seconds
      const pagesVisited = randomRange(1, 8);

      await db.query(
        `INSERT INTO visitors (visitor_id, session_id, device_type, browser, city, traffic_source, landing_page, time_spent, pages_visited, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [visitorId, sessionId, device, browser, city, source, landing, timeSpent, pagesVisited, timestamp]
      );
    }

    // 6. Seed Leads (with clear business patterns: Virar vs Thane, Keyword A vs Keyword B, Evening hour peaks)
    console.log('Seeding leads...');
    const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Sunil', 'Kiran', 'Nikhil', 'Anjali', 'Vijay', 'Pooja', 'Ramesh', 'Meena', 'Deepak', 'Sanjay', 'Geeta', 'Vikram'];
    const lastNames = ['Kumar', 'Sharma', 'Patel', 'Patil', 'Joshi', 'Mehta', 'Nair', 'Singh', 'Deshmukh', 'Sawant', 'Mishra', 'Gupta', 'Shinde', 'Rao', 'Shah'];
    const services = ['ICU Care', 'Home Nursing', 'Caregiver Services', 'Ward Boy Services', 'Medical Equipment Rental'];

    const leadKeywords = {
      'ICU Care': ['icu care service virar', 'home icu setup mumbai', 'icu bed rental near me'],
      'Home Nursing': ['home nursing services thane', 'nurse at home mumbai'],
      'Caregiver Services': ['cheap caregiver mumbai', 'patient care taker'],
      'Ward Boy Services': ['ward boy contact list', 'ward boy agency'],
      'Medical Equipment Rental': ['medical equipment rental online', 'oxygen concentrator rent']
    };

    const serviceRevenue = {
      'ICU Care': { min: 40000, max: 95000 },
      'Home Nursing': { min: 25000, max: 55000 },
      'Caregiver Services': { min: 15000, max: 30000 },
      'Ward Boy Services': { min: 10000, max: 20000 },
      'Medical Equipment Rental': { min: 5000, max: 15000 }
    };

    // We will generate 180 leads
    const totalLeads = 180;
    for (let i = 0; i < totalLeads; i++) {
      const name = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
      const phone = `+91 ${randomRange(90000, 99999)} ${randomRange(10000, 99999)}`;
      const service = randomChoice(services);
      
      // Select city with skewed conversion probabilities:
      // Virar: ~80% Conversion Rate
      // Thane: ~20% Conversion Rate
      // Others: ~40% Conversion Rate
      let city = randomChoice(cities);
      
      // Determine status based on city and keyword
      let status = 'New';
      const statusRoll = Math.random();

      if (city === 'Virar') {
        // High quality location
        if (statusRoll < 0.1) status = 'Contacted';
        else if (statusRoll < 0.2) status = 'Qualified';
        else if (statusRoll < 0.95) status = 'Converted'; // ~75% convert!
        else status = 'Lost';
      } else if (city === 'Thane') {
        // High quantity, low quality
        if (statusRoll < 0.4) status = 'New';
        else if (statusRoll < 0.6) status = 'Contacted';
        else if (statusRoll < 0.75) status = 'Qualified';
        else if (statusRoll < 0.9) status = 'Converted'; // ~15% convert
        else status = 'Lost';
      } else {
        // Neutral conversion
        if (statusRoll < 0.2) status = 'New';
        else if (statusRoll < 0.4) status = 'Contacted';
        else if (statusRoll < 0.55) status = 'Qualified';
        else if (statusRoll < 0.85) status = 'Converted'; // ~30% convert
        else status = 'Lost';
      }

      // Keyword selection & conversion modification
      const kwList = leadKeywords[service];
      let keyword = randomChoice(kwList);
      
      // Let's force Keyword A vs Keyword B logic
      // Keyword A: 'icu care service virar' / 'icu bed rental near me' -> High Conversion
      // Keyword B: 'cheap caregiver mumbai' -> Low conversion, money waster
      if (keyword === 'cheap caregiver mumbai') {
        // Waste keyword - override status to Lost or New/Contacted, very low conversion
        if (Math.random() < 0.90) {
          status = randomChoice(['Lost', 'New', 'Contacted']);
        } else {
          status = 'Converted';
        }
      } else if (keyword === 'icu care service virar') {
        // High performance keyword - override to Converted
        if (Math.random() < 0.90) {
          status = 'Converted';
          city = 'Virar'; // Make sure the city aligns
        }
      }

      // Submission Time hours distribution:
      // High volume in evening (9pm-11pm)
      let hour;
      const hourRoll = Math.random();
      if (hourRoll < 0.45) {
        hour = randomChoice([21, 22]); // 45% of conversions happen 9-11 PM
      } else {
        hour = randomRange(8, 20); // 55% during standard hours
      }

      const daysAgo = randomRange(0, 30);
      const submissionTime = getDateDaysAgo(daysAgo, hour);

      const campaign = `Google Ads - ${service}`;
      const landing = `/${service.toLowerCase().replace(/\s+/g, '-')}`;

      // Revenue generation for converted customers
      let revenue = 0;
      if (status === 'Converted') {
        const revLimits = serviceRevenue[service];
        revenue = randomRange(revLimits.min, revLimits.max);
      }

      await db.query(
        `INSERT INTO leads (name, phone, service_interest, city, campaign_source, keyword, landing_page, status, revenue, submission_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [name, phone, service, city, campaign, keyword, landing, status, revenue, submissionTime]
      );
    }

    // 7. Seed initial recommendations
    console.log('Seeding pre-defined recommendations...');
    const defaultRecs = [
      {
        type: 'geo',
        title: 'Increase Bidding Budget in Virar Region',
        recommendation: 'Virar leads demonstrate an exceptional conversion rate of 78% (23/29 leads converted to paying customers) yielding high average customer values. Recommend shifting 20% budget from Thane, which is displaying high lead volumes but sub-18% conversion rate.',
        impact_score: 9,
        status: 'Active'
      },
      {
        type: 'schedule',
        title: 'Optimize Ad Bid Scheduling for 9 PM - 11 PM Peak',
        recommendation: 'Historical session conversions reveal a major peak between 9:00 PM and 11:00 PM (accounting for 42% of total lead conversions). Increase ad bids by +25% during this time window to capture high-intent evening traffic.',
        impact_score: 8,
        status: 'Active'
      },
      {
        type: 'keyword',
        title: 'Pause Underperforming Keyword: "cheap caregiver mumbai"',
        recommendation: 'The keyword "cheap caregiver mumbai" has consumed ₹18,600 in Google Ads spend but generated only 2 low-tier customers, resulting in a disastrous ROAS of 0.4x. Recommend immediately pausing this keyword and re-allocating funds to "icu care service virar".',
        impact_score: 9,
        status: 'Active'
      },
      {
        type: 'budget',
        title: 'Scale High ROAS ICU Care Campaign',
        recommendation: 'The "ICU Care" campaign has generated ₹2,84,000 in revenue from a spend of ₹48,000, producing a return on ad spend (ROAS) of 5.9x. Expand the daily campaign budget by 20% to capture additional search volume.',
        impact_score: 10,
        status: 'Active'
      }
    ];

    for (const rec of defaultRecs) {
      await db.query(
        `INSERT INTO ai_recommendations (type, title, recommendation, impact_score, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [rec.type, rec.title, rec.recommendation, rec.impact_score, rec.status]
      );
    }

    // Commit transaction
    await db.exec('COMMIT;');

    console.log('Database seeded successfully with rich marketing data!');
  } catch (error) {
    // Rollback on failure
    try {
      await db.exec('ROLLBACK;');
    } catch (rbErr) {
      // Ignore rollback errors
    }
    console.error('Error seeding database:', error);
  }
}

// =========================================================
// Real-world Google AdSense & Google Ads API Sync Integrations
// =========================================================

/**
 * Exchanges a Google OAuth2 refresh token for a fresh access token
 */
async function renewGoogleAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google OAuth2 renewal failed: ${response.status} - ${errBody}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error renewing Google OAuth2 Access Token:', error.message);
    throw error;
  }
}

/**
 * Fetch and sync report metrics from Google AdSense API
 * Endpoint: https://adsense.googleapis.com/v2/accounts/{accountId}/reports:generate
 */
async function syncAdSenseData() {
  const { 
    ADSENSE_CLIENT_ID, 
    ADSENSE_CLIENT_SECRET, 
    ADSENSE_REFRESH_TOKEN, 
    ADSENSE_ACCOUNT_ID 
  } = process.env;

  if (!ADSENSE_CLIENT_ID || !ADSENSE_CLIENT_SECRET || !ADSENSE_REFRESH_TOKEN || !ADSENSE_ACCOUNT_ID) {
    console.log('[ETL Pipeline] Google AdSense API credentials missing from environment. Using simulated data.');
    return null;
  }

  console.log('[ETL Pipeline] Initializing Google AdSense API sync...');
  try {
    const accessToken = await renewGoogleAccessToken(ADSENSE_CLIENT_ID, ADSENSE_CLIENT_SECRET, ADSENSE_REFRESH_TOKEN);
    
    // Construct AdSense report generation URL
    // Pulling Date, Impressions, Clicks, and Estimated Earnings for the last 30 days
    const url = new URL(`https://adsense.googleapis.com/v2/accounts/${ADSENSE_ACCOUNT_ID}/reports:generate`);
    url.searchParams.append('dateRange', 'LAST_30_DAYS');
    url.searchParams.append('metrics', 'IMPRESSIONS');
    url.searchParams.append('metrics', 'CLICKS');
    url.searchParams.append('metrics', 'ESTIMATED_EARNINGS');
    url.searchParams.append('dimensions', 'DATE');
    url.searchParams.append('dimensions', 'AD_CLIENT_ID');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`AdSense API call failed: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    console.log('[ETL Pipeline] Google AdSense data successfully synced. Rows fetched:', data.rows ? data.rows.length : 0);
    
    // In a production app, we would loop through data.rows and write the publisher earnings to our warehouse.
    return data;
  } catch (error) {
    console.error('[ETL Pipeline] Error during Google AdSense sync:', error.message);
    return null;
  }
}

/**
 * Fetch and sync campaign keyword spend from Google Ads API (GAQL Query)
 * Endpoint: https://googleads.googleapis.com/v17/customers/{customerId}/googleAds:search
 */
async function syncGoogleAdsData() {
  const {
    GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_CUSTOMER_ID
  } = process.env;

  if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_CUSTOMER_ID) {
    console.log('[ETL Pipeline] Google Ads API credentials missing from environment. Using simulated data.');
    return null;
  }

  console.log('[ETL Pipeline] Initializing Google Ads API sync...');
  try {
    const accessToken = await renewGoogleAccessToken(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN);
    const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, ''); // Remove hyphens for API format

    const url = `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`;
    
    // Google Ads Query Language (GAQL) payload fetching Cost, Clicks, and Conversions grouped by keyword
    const gaqlQuery = `
      SELECT 
        campaign.name, 
        ad_group.name, 
        ad_group_criterion.keyword.text, 
        metrics.cost_micros, 
        metrics.clicks, 
        metrics.conversions,
        segments.date
      FROM keyword_view 
      WHERE segments.date DURING LAST_30_DAYS
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: gaqlQuery })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Ads API call failed: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    console.log('[ETL Pipeline] Google Ads data successfully synced. Rows fetched:', data.results ? data.results.length : 0);

    // Write results to database if results returned
    if (data.results && data.results.length > 0) {
      console.log('[ETL Pipeline] Parsing Google Ads keyword performance and writing to database...');
      // Start transaction
      await db.exec('BEGIN TRANSACTION;');
      
      // Clear old campaign data
      await db.exec('DELETE FROM campaign_performance;');

      for (const row of data.results) {
        const campaignName = row.campaign.name;
        const adGroupName = row.adGroup.name;
        const keyword = row.adGroupCriterion.keyword.text;
        const cost = Number(row.metrics.costMicros) / 1000000; // Convert micros to standard currency units
        const clicks = Number(row.metrics.clicks) || 0;
        const conversions = Number(row.metrics.conversions) || 0;
        const date = row.segments.date; // Format YYYY-MM-DD

        await db.query(
          `INSERT INTO campaign_performance (campaign_name, ad_group, keyword, cost, clicks, conversions, recorded_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [campaignName, adGroupName, keyword, cost.toFixed(2), clicks, conversions, date]
        );
      }
      
      await db.exec('COMMIT;');
      console.log('[ETL Pipeline] Google Ads data written to campaign_performance successfully.');
    }

    return data;
  } catch (error) {
    console.error('[ETL Pipeline] Error during Google Ads sync:', error.message);
    // Rollback if transaction failed
    try { await db.exec('ROLLBACK;'); } catch (e) {}
    return null;
  }
}

// Modify seedData to invoke the sync methods if configured
const originalSeedData = seedData;
seedData = async function() {
  await originalSeedData();
  // Trigger API syncs
  await syncAdSenseData();
  await syncGoogleAdsData();
};

// If run directly
if (require.main === module) {
  seedData().then(() => {
    process.exit(0);
  });
}

module.exports = {
  seedData,
  syncAdSenseData,
  syncGoogleAdsData
};
