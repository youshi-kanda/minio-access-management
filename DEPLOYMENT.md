# MinIO Access Management - Deployment Guide

## 🚀 デプロイメントガイド

### 前提条件

- Docker & Docker Compose インストール済み
- 既存の MinIO サーバー (https://minio.tunagu.app)
- ドメイン設定済み (`admin.tunagu.app`, `files.tunagu.app`)
- SMTP サーバー設定（招待メール用）

### 🔧 環境設定

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd minio×access
```

2. **環境変数の設定**
```bash
# .env.example をコピーして設定
cp .env.example .env

# 必要な環境変数を設定
vim .env
```

3. **必須環境変数**
```bash
# MinIO接続情報
MINIO_ENDPOINT=https://minio.tunagu.app
MINIO_ADMIN_ACCESS_KEY=your-admin-access-key
MINIO_ADMIN_SECRET_KEY=your-admin-secret-key

# SMTP設定（招待メール用）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASS=your-smtp-password
FROM_ADDR=minio-noreply@tunagu.tech

# セキュリティ
SESSION_SECRET=your-random-session-secret

# 本番URL
NEXT_PUBLIC_ADMIN_BASE=https://admin.tunagu.app
NEXT_PUBLIC_FILES_BASE=https://files.tunagu.app
```

### 🐳 Docker デプロイメント

#### 開発環境

```bash
# Makefileを使用（推奨）
make setup  # 初回セットアップ
make dev    # 開発環境起動

# または直接Docker Composeを使用
docker-compose -f docker-compose.dev.yml up --build
```

#### 本番環境

```bash
# Makefileを使用（推奨）
make prod   # 本番環境起動

# または直接Docker Composeを使用
docker-compose up --build -d
```

### 🌐 リバースプロキシ設定 (Nginx)

```nginx
# /etc/nginx/sites-available/minio-access
server {
    listen 443 ssl;
    server_name admin.tunagu.app;
    
    ssl_certificate /etc/letsencrypt/live/admin.tunagu.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.tunagu.app/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name files.tunagu.app;
    
    ssl_certificate /etc/letsencrypt/live/files.tunagu.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/files.tunagu.app/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # ファイルアップロード用の設定
    client_max_body_size 100M;
    proxy_request_buffering off;
}

# HTTP -> HTTPS リダイレクト
server {
    listen 80;
    server_name admin.tunagu.app files.tunagu.app;
    return 301 https://$host$request_uri;
}
```

### 📋 デプロイメント手順

1. **VPSサーバーにログイン**
```bash
ssh your-user@your-vps-server
```

2. **プロジェクトファイルをアップロード**
```bash
# SCP または Git Clone
scp -r minio×access/ user@server:/opt/
# または
git clone <repo> /opt/minio×access
cd /opt/minio×access
```

3. **環境変数を設定**
```bash
vim .env
# 本番用の値に変更
```

4. **Docker Composeで起動**
```bash
make prod
# または
docker-compose up -d --build
```

5. **Nginx設定とSSL**
```bash
# Nginx設定ファイルを作成
sudo vim /etc/nginx/sites-available/minio-access
sudo ln -s /etc/nginx/sites-available/minio-access /etc/nginx/sites-enabled/

# SSL証明書取得
sudo certbot --nginx -d admin.tunagu.app -d files.tunagu.app

# Nginx再起動
sudo systemctl reload nginx
```

### 🔍 動作確認

```bash
# サービス状態確認
make status

# ヘルスチェック
make health

# ログ確認
make logs

# MinIO接続テスト
make test-connection
```

### 📊 監視とメンテナンス

#### ログ監視
```bash
# リアルタイムログ
make logs

# 特定サービスのログ
make logs-admin
make logs-files
make logs-frontend
```

#### バックアップ
```bash
# ポリシーファイルのバックアップ
make backup-policies

# Docker volumes のバックアップ
docker run --rm -v minio-access_mc-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/mc-data-$(date +%Y%m%d).tar.gz -C /data .
```

### 🚨 トラブルシューティング

#### よくある問題

1. **MinIO接続エラー**
```bash
# MinIO接続テスト
make test-connection

# 環境変数確認
docker-compose config
```

2. **SMTP接続エラー**
```bash
# SMTP設定確認
docker-compose logs admin-api | grep -i smtp
```

3. **権限エラー**
```bash
# mc alias 確認
docker-compose exec admin-api mc alias list
```

#### ログ確認コマンド
```bash
# 全サービスログ
make logs

# エラーのみ表示
make logs | grep -i error

# 特定時間のログ
docker-compose logs --since 2023-01-01T00:00:00 admin-api
```

### 🔄 アップデート手順

1. **バックアップ作成**
```bash
make backup-policies
docker-compose down
```

2. **コード更新**
```bash
git pull origin main
```

3. **再ビルドと起動**
```bash
make prod
```

4. **動作確認**
```bash
make health
```

### 🛡️ セキュリティ設定

#### ファイアウォール設定
```bash
# UFW設定例
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3000:3002/tcp # 直接アクセス拒否
sudo ufw enable
```

#### SSL/TLS設定
```bash
# Let's Encrypt証明書の自動更新
sudo crontab -e
# 以下を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

### 📞 サポート

問題が発生した場合は、以下の情報を収集してください：

1. エラーメッセージ
2. サービス状態: `make status`
3. ログ: `make logs`
4. 環境変数設定（機密情報は除く）

### 🎯 パフォーマンスチューニング

#### Docker設定の最適化
```bash
# docker-compose.yml での制限例
services:
  admin-api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

#### Nginx設定の最適化
```nginx
# ファイルアップロード最適化
client_max_body_size 1G;
proxy_timeout 300s;
proxy_read_timeout 300s;
```