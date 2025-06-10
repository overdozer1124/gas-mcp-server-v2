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
    instructions: 'Copy the authorization code from the callback and use /oauth/token endpoint'
  });
});

// OAuth コールバック
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    res.send(`
      <h1>✅ Authorization Successful!</h1>
      <p>MCP Server is now authorized to access your Google account.</p>
      <p><strong>🔑 Refresh Token:</strong> <code>${tokens.refresh_token}</code></p>
      <p>Save this refresh token as GOOGLE_REFRESH_TOKEN environment variable for production use.</p>
      <button onclick="window.close()">Close Window</button>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Error during authorization: ' + error.message);
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
    
    console.log('Creating container-bound script with parentId:', parentId);
    
    // 正しいGoogle Apps Script API呼び出し
    const requestBody = {
      title: title || 'Container Bound Script',
      parentId: parentId  // 🔑 これが重要！
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await script.projects.create({
      requestBody: requestBody
    });
    
    const scriptId = response.data.scriptId;
    const scriptUrl = `https://script.google.com/d/${scriptId}/edit`;
    
    console.log('✅ Container-bound script created successfully:', scriptId);
    
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
});

module.exports = app;