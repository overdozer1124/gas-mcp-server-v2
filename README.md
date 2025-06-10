# 🚀 Gas MCP Server v2.0

**Google Apps Script MCP Server with Enhanced Authentication and Container-Bound Support**

## 🎯 Features

- ✅ **Container-Bound Apps Script Creation**: Proper `parentId` handling
- ✅ **OAuth2 Authentication**: Secure Google API access
- ✅ **MCP Protocol Compatible**: Works with Claude Desktop
- ✅ **Error Handling**: Comprehensive error reporting
- ✅ **Debug Support**: Detailed logging for troubleshooting

## 🔧 Installation

### 1. Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Foverdozer1124%2Fgas-mcp-server-v2)

### 2. Environment Variables

Set the following environment variables in Railway:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-railway-app.up.railway.app/oauth/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token
NODE_ENV=production
PORT=3001
```

## 🔑 Authentication Setup

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google Sheets API
   - Google Apps Script API
   - Google Drive API
4. Create OAuth 2.0 Credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-railway-app.up.railway.app/oauth/callback`

### 2. Get Refresh Token

1. Access: `https://your-railway-app.up.railway.app/mcp/authorize`
2. Complete OAuth flow
3. Copy the refresh token
4. Update Railway environment variable: `GOOGLE_REFRESH_TOKEN`

## 🚀 API Endpoints

### Health Check
```bash
GET /health
```

### Authorization
```bash
GET /mcp/authorize
GET /oauth/callback
```

### Apps Script Operations
```bash
POST /create_container_bound_script
PUT /update_script_content
POST /run_script
```

## 🧪 Testing Container-Bound Creation

```bash
curl -X POST "https://your-railway-app.up.railway.app/create_container_bound_script" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Container-Bound Script",
    "parentId": "YOUR_SPREADSHEET_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "scriptId": "SCRIPT_ID",
  "url": "https://script.google.com/d/SCRIPT_ID/edit",
  "parentId": "YOUR_SPREADSHEET_ID",
  "containerBound": true
}
```

## 🔍 Troubleshooting

### Container-Bound Verification

In Apps Script editor, run:
```javascript
function verifyContainerBinding() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log('✅ Container-bound successful:', spreadsheet.getId());
    return spreadsheet.getId();
  } catch (error) {
    console.log('❌ Container-bound failed:', error.toString());
    return null;
  }
}
```

### Common Issues

1. **`parentId` not working**: Check Google Apps Script API is enabled
2. **Authentication errors**: Verify refresh token and scopes
3. **Permission errors**: Ensure OAuth consent screen is configured

## 📝 License

MIT © 2025 - Gas MCP Server v2.0
