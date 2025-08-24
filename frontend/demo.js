const express = require('express');
const path = require('path');

const app = express();
const PORT = 3003;

// Static files
app.use(express.static('public'));

// Demo HTML page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>MinIO Access Management System</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.online { background: #10b981; color: white; }
            .status.offline { background: #ef4444; color: white; }
            .btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 5px; }
            .btn:hover { background: #2563eb; }
            .btn.secondary { background: #6b7280; }
            .api-test { background: #f8fafc; padding: 15px; border-radius: 4px; margin: 10px 0; }
            .success { color: #10b981; }
            .error { color: #ef4444; }
            #test-results { margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 MinIO Access Management System</h1>
                <p>完全なMinIOアクセス管理システム - ローカル開発環境</p>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h2>🖥️ サービス状況</h2>
                    <div class="api-test">
                        <strong>MinIO Server:</strong> <span class="status online">ONLINE</span><br>
                        <small>http://localhost:9000</small>
                    </div>
                    <div class="api-test">
                        <strong>Admin API:</strong> <span id="admin-status" class="status">チェック中...</span><br>
                        <small>http://localhost:3001</small>
                    </div>
                    <div class="api-test">
                        <strong>File API:</strong> <span id="file-status" class="status">チェック中...</span><br>
                        <small>http://localhost:3002</small>
                    </div>
                </div>
                
                <div class="card">
                    <h2>🚀 クイックアクセス</h2>
                    <a href="http://localhost:9001" target="_blank" class="btn">MinIO Console</a>
                    <a href="#" onclick="testLogin()" class="btn secondary">認証テスト</a>
                    <a href="#" onclick="testBuckets()" class="btn secondary">バケット一覧</a>
                    <a href="#" onclick="testFiles()" class="btn secondary">ファイル一覧</a>
                </div>
                
                <div class="card">
                    <h2>🔐 認証情報</h2>
                    <div class="api-test">
                        <strong>MinIO Console:</strong><br>
                        ユーザー: minioadmin<br>
                        パスワード: minioadmin
                    </div>
                    <div class="api-test">
                        <strong>システム認証:</strong><br>
                        メール: admin@example.com<br>
                        パスワード: admin123
                    </div>
                </div>
                
                <div class="card">
                    <h2>📊 機能一覧</h2>
                    <ul>
                        <li>✅ バケット管理</li>
                        <li>✅ ユーザー管理</li>
                        <li>✅ ファイル操作</li>
                        <li>✅ 招待システム</li>
                        <li>✅ Google OAuth</li>
                        <li>✅ SSL/TLS対応</li>
                    </ul>
                </div>
            </div>
            
            <div id="test-results"></div>
        </div>
        
        <script>
            // Service health checks
            async function checkService(url, elementId, serviceName) {
                try {
                    const response = await fetch(url);
                    const element = document.getElementById(elementId);
                    if (response.ok) {
                        element.className = 'status online';
                        element.textContent = 'ONLINE';
                    } else {
                        element.className = 'status offline';
                        element.textContent = 'ERROR';
                    }
                } catch (error) {
                    const element = document.getElementById(elementId);
                    element.className = 'status offline';
                    element.textContent = 'OFFLINE';
                }
            }
            
            // Test functions
            async function testLogin() {
                const results = document.getElementById('test-results');
                results.innerHTML = '<div class="card"><h3>認証テスト中...</h3></div>';
                
                try {
                    const response = await fetch('http://localhost:3001/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        results.innerHTML = '<div class="card"><h3 class="success">✅ 認証成功!</h3><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
                        window.authCookie = document.cookie;
                    } else {
                        results.innerHTML = '<div class="card"><h3 class="error">❌ 認証失敗</h3><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
                    }
                } catch (error) {
                    results.innerHTML = '<div class="card"><h3 class="error">❌ 接続エラー</h3><p>' + error.message + '</p></div>';
                }
            }
            
            async function testBuckets() {
                const results = document.getElementById('test-results');
                results.innerHTML = '<div class="card"><h3>バケット一覧取得中...</h3></div>';
                
                try {
                    const response = await fetch('http://localhost:3001/api/buckets', {
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    results.innerHTML = '<div class="card"><h3 class="success">📁 バケット一覧</h3><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
                } catch (error) {
                    results.innerHTML = '<div class="card"><h3 class="error">❌ 取得エラー</h3><p>' + error.message + '</p></div>';
                }
            }
            
            async function testFiles() {
                const results = document.getElementById('test-results');
                results.innerHTML = '<div class="card"><h3>ファイル一覧取得中...</h3></div>';
                
                try {
                    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ email: 'user@example.com', password: 'admin123' })
                    });
                    
                    const response = await fetch('http://localhost:3002/api/objects?bucket=demo-bucket', {
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    results.innerHTML = '<div class="card"><h3 class="success">📄 ファイル一覧</h3><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
                } catch (error) {
                    results.innerHTML = '<div class="card"><h3 class="error">❌ 取得エラー</h3><p>' + error.message + '</p></div>';
                }
            }
            
            // Initialize health checks
            window.onload = function() {
                checkService('http://localhost:3001/health', 'admin-status', 'Admin API');
                checkService('http://localhost:3002/health', 'file-status', 'File API');
            };
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
  console.log('MinIO Access Management System - Demo Interface');
});