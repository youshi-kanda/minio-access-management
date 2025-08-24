# Nginx Configuration for MinIO Access Management

このディレクトリには、MinIO Access Management システム用のNginx設定ファイルが含まれています。

## 📁 ディレクトリ構成

```
nginx/
├── nginx.conf                    # メインNginx設定
├── conf.d/                       # サイト別設定
│   ├── admin.tunagu.app.conf     # 管理UI設定
│   └── files.tunagu.app.conf     # ファイルUI設定
├── scripts/                      # 設定スクリプト
│   ├── nginx-install.sh          # Nginx自動インストール
│   └── ssl-setup.sh              # SSL証明書設定
├── docker-compose.nginx.yml      # Docker版Nginx構成
└── README.md                     # このファイル
```

## 🚀 セットアップ方法

### 方法1: 直接インストール（推奨）

1. **Nginxの自動インストールと設定**
```bash
sudo bash nginx/scripts/nginx-install.sh
```

2. **アプリケーションの起動**
```bash
make prod
```

3. **SSL証明書の設定**
```bash
sudo bash nginx/scripts/ssl-setup.sh
```

### 方法2: Docker Composeを使用

```bash
# Nginx + アプリケーションを同時に起動
docker-compose -f nginx/docker-compose.nginx.yml up -d

# SSL証明書の初回取得（コンテナ内で実行）
docker-compose -f nginx/docker-compose.nginx.yml exec certbot \
  certbot certonly --webroot --webroot-path=/var/www/certbot \
  --email admin@tunagu.tech --agree-tos --no-eff-email \
  -d admin.tunagu.app -d files.tunagu.app
```

## 🔧 設定の詳細

### 主要機能

- **HTTPS リダイレクト**: HTTP → HTTPS 自動リダイレクト
- **SSL/TLS**: Let's Encrypt証明書による暗号化
- **レート制限**: APIエンドポイントの過負荷保護
- **ファイルアップロード最適化**: 大容量ファイル対応
- **セキュリティヘッダー**: XSS、CSRF等の対策
- **Gzip圧縮**: 転送量削減
- **キャッシュ設定**: 静的リソースの最適化

### レート制限設定

| エンドポイント | 制限 | 用途 |
|---------------|------|------|
| `/api/auth/login` | 5回/分 | ログイン試行制限 |
| `/api/` | 100回/分 | 一般API制限 |
| `/api/upload` | 10回/分 | アップロード制限 |

### ファイルアップロード設定

- **最大ファイルサイズ**: 1GB
- **タイムアウト**: 600秒
- **バッファリング**: 無効（ストリーミング）

## 🔒 セキュリティ機能

### SSL/TLS設定
- **プロトコル**: TLS 1.2, 1.3
- **暗号化スイート**: 現代的な暗号化方式
- **HSTS**: HTTP Strict Transport Security
- **証明書**: Let's Encrypt（自動更新）

### セキュリティヘッダー
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: ...
```

### ファイル保護
- dotfiles (`.env`, `.git` 等) のアクセス拒否
- 設定ファイル (`*.conf`, `*.log` 等) のアクセス拒否

## 📊 監視とログ

### アクセスログ形式
```
$remote_addr - $remote_user [$time_local] "$request" 
$status $body_bytes_sent "$http_referer" 
"$http_user_agent" "$http_x_forwarded_for" 
rt=$request_time uct="$upstream_connect_time"
```

### ログファイル
- アクセスログ: `/var/log/nginx/access.log`
- エラーログ: `/var/log/nginx/error.log`

## 🛠️ カスタマイズ

### ドメイン変更
1. `conf.d/*.conf` ファイルの `server_name` を変更
2. SSL証明書の再取得: `ssl-setup.sh` を再実行

### アップロードサイズ制限変更
```nginx
# files.tunagu.app.conf で変更
client_max_body_size 2G;  # 2GBに変更
```

### レート制限調整
```nginx
# nginx.conf で変更
limit_req_zone $binary_remote_addr zone=upload:10m rate=20r/m;  # 20回/分に変更
```

## 🔄 メンテナンス

### SSL証明書の確認
```bash
# 証明書の有効期限確認
sudo certbot certificates

# 手動更新テスト
sudo certbot renew --dry-run
```

### Nginx設定の再読み込み
```bash
# 設定テスト
sudo nginx -t

# 設定再読み込み
sudo systemctl reload nginx
```

### ログローテーション
```bash
# ログローテーション設定確認
sudo cat /etc/logrotate.d/nginx

# 手動ローテーション
sudo logrotate -f /etc/logrotate.d/nginx
```

## 🚨 トラブルシューティング

### よくある問題

1. **SSL証明書エラー**
```bash
# 証明書の状態確認
sudo certbot certificates

# 証明書の再取得
sudo certbot delete
sudo bash nginx/scripts/ssl-setup.sh
```

2. **アップロードエラー**
```bash
# アップロードサイズ制限の確認
grep client_max_body_size /etc/nginx/conf.d/files.tunagu.app.conf

# タイムアウト設定の確認
grep proxy_read_timeout /etc/nginx/conf.d/files.tunagu.app.conf
```

3. **レート制限に引っかかった場合**
```bash
# レート制限状態の確認
sudo tail -f /var/log/nginx/error.log | grep "limiting requests"

# 一時的な制限解除（要検討）
# limit_req_zone をコメントアウト
```

### ログ確認コマンド
```bash
# リアルタイムアクセスログ
sudo tail -f /var/log/nginx/access.log

# エラーログ
sudo tail -f /var/log/nginx/error.log

# 特定IPのアクセス
grep "192.168.1.100" /var/log/nginx/access.log
```

## 📞 サポート

設定に関する問題や質問がある場合は、以下の情報を収集してください：

1. Nginxのバージョン: `nginx -v`
2. 設定テスト結果: `nginx -t`
3. エラーログ: `/var/log/nginx/error.log`
4. SSL証明書状態: `certbot certificates`