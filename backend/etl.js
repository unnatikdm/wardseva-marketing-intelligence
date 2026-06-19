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

    // Commit transaction
    await db.exec('COMMIT;');

    console.log('Database seeded successfully with admin user only!');
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

function isPlaceholder(value) {
  return !value || value.trim() === '' || value.includes('your_') || value.includes('XXX-') || value.includes('pub-XXXX');
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

  if (
    isPlaceholder(ADSENSE_CLIENT_ID) ||
    isPlaceholder(ADSENSE_CLIENT_SECRET) ||
    isPlaceholder(ADSENSE_REFRESH_TOKEN) ||
    isPlaceholder(ADSENSE_ACCOUNT_ID)
  ) {
    throw new Error('Google AdSense API credentials are not configured. Mock data is disabled.');
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

  if (
    isPlaceholder(GOOGLE_ADS_DEVELOPER_TOKEN) ||
    isPlaceholder(GOOGLE_ADS_CLIENT_ID) ||
    isPlaceholder(GOOGLE_ADS_CLIENT_SECRET) ||
    isPlaceholder(GOOGLE_ADS_REFRESH_TOKEN) ||
    isPlaceholder(GOOGLE_ADS_CUSTOMER_ID)
  ) {
    throw new Error('Google Ads API credentials are not configured. Mock data is disabled.');
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
  try {
    await syncAdSenseData();
  } catch (err) {
    console.warn('[ETL Pipeline] AdSense API Sync Skipped:', err.message);
  }
  try {
    await syncGoogleAdsData();
  } catch (err) {
    console.warn('[ETL Pipeline] Google Ads API Sync Skipped:', err.message);
  }
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
