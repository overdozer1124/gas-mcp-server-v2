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
          <div class="endpoint">GET  /auth/callback - OAuth callback handler (FIXED)</div>
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
curl -X POST "https://gas-mcp-server-v2-production.up.railway.app/create_container_bound_script" \\<br>
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
    port: PORT,
    hasAuth: !!process.env.GOOGLE_CLIENT_ID,
    hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
    authStatus: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) ? 'Ready' : 'Incomplete'
  });
});

// OAuth認証URL生成
app.get('/mcp/authorize', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.scripts',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/script.projects'
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  
  res.json({
    success: true,
    authUrl,
    message: 'Please visit this URL to complete OAuth authorization',
    instructions: 'Copy the authorization code from the callback and use /auth/callback endpoint'
  });
});

// 🔧 修正: OAuth コールバック（/auth/callback に統一）
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #d32f2f;">❌ Authorization Failed</h2>
            <p>Authorization code not provided. Please try the authorization process again.</p>
            <a href="/mcp/authorize" style="color: #1976d2; text-decoration: none;">🔄 Retry Authorization</a>
          </div>
        </body>
      </html>
    `);
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ OAuth tokens received successfully');
    console.log('🔑 Refresh Token:', tokens.refresh_token ? 'Present' : 'Missing');
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1>✅ Authorization Successful!</h1>
            <p>MCP Server v2.0 is now authorized to access your Google account.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>🔑 Refresh Token:</strong><br>
              <code style="word-break: break-all; font-size: 12px;">${tokens.refresh_token || 'Not provided'}</code>
            </div>
            <p><small>Save this refresh token as GOOGLE_REFRESH_TOKEN environment variable for production use.</small></p>
            <button onclick="window.close()" style="background: #1976d2; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close Window</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #d32f2f;">❌ OAuth Error</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <a href="/mcp/authorize" style="color: #1976d2; text-decoration: none;">🔄 Retry Authorization</a>
          </div>
        </body>
      </html>
    `);
  }
});

// 🚀 重要: コンテナバインドApps Script作成（修正版）
app.post('/create_container_bound_script', async (req, res) => {
  try {
    const { title, parentId } = req.body;
    
    if (!parentId) {
      return res.status(400).json({
        success: false,
        error: 'parentId is required for container-bound script'
      });
    }
    
    console.log('🔍 Creating container-bound script with parentId:', parentId);
    
    // 正しいGoogle Apps Script API呼び出し
    const requestBody = {
      title: title || 'Container Bound Script',
      parentId: parentId  // 🔑 これが重要！
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await script.projects.create({
      requestBody: requestBody
    });
    
    const scriptId = response.data.scriptId;
    const scriptUrl = `https://script.google.com/d/${scriptId}/edit`;
    
    console.log('✅ Container-bound script created successfully:', scriptId);
    console.log('📊 Parent container:', parentId);
    
    res.json({
      success: true,
      scriptId: scriptId,
      url: scriptUrl,
      parentId: parentId,
      containerBound: true
    });
    
  } catch (error) {
    console.error('❌ Error creating container-bound script:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// スクリプトコンテンツ更新
app.put('/update_script_content', async (req, res) => {
  try {
    const { scriptId, files } = req.body;
    
    if (!scriptId || !files) {
      return res.status(400).json({
        success: false,
        error: 'scriptId and files are required'
      });
    }
    
    const response = await script.projects.updateContent({
      scriptId: scriptId,
      requestBody: {
        files: files
      }
    });
    
    res.json({
      success: true,
      result: response.data
    });
    
  } catch (error) {
    console.error('Error updating script content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// スクリプト実行
app.post('/run_script', async (req, res) => {
  try {
    const { scriptId, functionName, parameters } = req.body;
    
    const response = await script.scripts.run({
      scriptId: scriptId,
      requestBody: {
        function: functionName,
        parameters: parameters || []
      }
    });
    
    res.json({
      success: true,
      result: response.data
    });
    
  } catch (error) {
    console.error('Error running script:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Gas MCP Server v2.0 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authorize: http://localhost:${PORT}/mcp/authorize`);
  console.log(`✅ OAuth callback: http://localhost:${PORT}/auth/callback`);
});

module.exports = app;