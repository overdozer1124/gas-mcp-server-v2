const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// OAuth2設定
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// リフレッシュトークンが存在する場合は設定
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
}

// Google Apps Script API クライアント
const script = google.script({ version: 'v1', auth: oauth2Client });
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

// 🎯 ルートエンドポイント（ダッシュボード）
app.get('/', (req, res) => {
  const hasAuth = !!process.env.GOOGLE_CLIENT_ID;
  const hasRefreshToken = !!process.env.GOOGLE_REFRESH_TOKEN;
  const authStatus = (hasAuth && hasRefreshToken) ? 'Ready' : 'Incomplete';
  
  res.send(`
    <html>
      <head>
        <title>🚀 GAS MCP Server v2.0 Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
          .ready { background: #e8f5e8; color: #2e7d32; }
          .warning { background: #fff3e0; color: #ef6c00; }
          .error { background: #ffebee; color: #c62828; }
          .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
          .fix { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 15px 0; }
          a { color: #1976d2; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 GAS MCP Server v2.0</h1>
          <div class="status ${authStatus === 'Ready' ? 'ready' : authStatus === 'Incomplete' ? 'warning' : 'error'}">
            <strong>Status:</strong> ${authStatus === 'Ready' ? '✅ Ready' : authStatus === 'Incomplete' ? '⚠️ Partial Auth' : '❌ Not Authenticated'}
          </div>
          
          <div class="fix">
            <strong>🔧 Container Bind Fix v2.0:</strong><br>
            ✅ Fixed parentId parameter handling<br>
            ✅ Enhanced error logging and debugging<br>
            ✅ Streamlined API structure<br>
            ✅ Improved container-bound script creation
          </div>
          
          <h2>📡 Available Endpoints</h2>
          <div class="endpoint">GET  <a href="/health">/health</a> - Server health check</div>
          <div class="endpoint">GET  <a href="/mcp/authorize">/mcp/authorize</a> - OAuth authorization URL</div>
          <div class="endpoint">GET  /oauth/callback - OAuth callback handler</div>
          <div class="endpoint">POST /create_container_bound_script - Create container bound script (FIXED)</div>
          <div class="endpoint">PUT  /update_script_content - Update script content</div>
          <div class="endpoint">POST /run_script - Execute script function</div>
          
          <h2>🔧 Quick Setup</h2>
          <ol>
            <li>Visit <a href="/mcp/authorize">/mcp/authorize</a> to get OAuth URL</li>
            <li>Complete OAuth flow in browser</li>
            <li>Save refresh token to GOOGLE_REFRESH_TOKEN environment variable</li>
            <li>Start using the fixed API endpoints</li>
          </ol>
          
          <h2>🌐 Server Info</h2>
          <div class="endpoint">Version: 2.0 (Fixed)</div>
          <div class="endpoint">Port: ${PORT}</div>
          <div class="endpoint">Environment: ${process.env.NODE_ENV || 'development'}</div>
          <div class="endpoint">Auth Client: ${hasAuth ? '✅ Configured' : '❌ Missing'}</div>
          <div class="endpoint">Refresh Token: ${hasRefreshToken ? '✅ Present' : '❌ Missing'}</div>
          
          <h2>🧪 Test Container Bind Creation</h2>
          <div class="fix">
            <strong>Fixed API Test Command:</strong><br>
            <code style="display: block; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0;">
curl -X POST "${process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : `http://localhost:${PORT}`}/create_container_bound_script" \\<br>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;-d '{"title": "v2 Test", "parentId": "YOUR_SPREADSHEET_ID"}'
            </code>
          </div>
        </div>
      </body>
    </html>
  `);
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT