const http = require('http');
const url = require('url');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

console.log('========================================================');
console.log('     Google Ads API OAuth2 Refresh Token Generator     ');
console.log('========================================================\n');

rl.question('1. Enter your Google OAuth2 Client ID: ', (clientId) => {
  if (!clientId) {
    console.error('Client ID is required!');
    process.exit(1);
  }

  rl.question('2. Enter your Google OAuth2 Client Secret: ', (clientSecret) => {
    if (!clientSecret) {
      console.error('Client Secret is required!');
      process.exit(1);
    }

    // Start a temporary HTTP server to capture redirect code
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);

      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code;

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization Successful!</h1><p>You can close this tab and return to the terminal.</p>');

          server.close();

          console.log('\n[OAuth] Authorization code received. Exchanging for tokens...');

          try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
              })
            });

            if (!tokenResponse.ok) {
              const errText = await tokenResponse.text();
              throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errText}`);
            }

            const tokens = await tokenResponse.json();
            console.log('\n========================================================');
            console.log('🎉 SUCCESS! Copy the Refresh Token below:');
            console.log('========================================================');
            console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('========================================================\n');
          } catch (error) {
            console.error('\n❌ Error exchanging authorization code:', error.message);
          } finally {
            process.exit(0);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Failed to authorize</h1><p>No code parameter found in the callback url.</p>');
          process.exit(1);
        }
      }
    });

    server.listen(PORT, () => {
      // Build Auth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/adwords',
        access_type: 'offline',
        prompt: 'consent'
      }).toString();

      console.log('\n========================================================');
      console.log('👉 ACTION REQUIRED: Open the link below in your browser and authorize access:');
      console.log('========================================================');
      console.log(authUrl);
      console.log('========================================================\n');
      console.log('Waiting for browser callback on port 8080...');
    });
  });
});
