# 🚀 ConoHa VPS デプロイ手順書

## 📋 **現在の環境確認**

### ✅ **準備済み項目**
- ConoHa VPSサーバー ✅
- ドメイン取得済み ✅
- 既存MinIOサーバー ✅
- Google OAuth使用予定 ✅

## 🔧 **必要な情報収集**

### **1. ConoHa VPS情報**
```
IPアドレス: [ConoHaコントロールパネルで確認]
OS: Ubuntu 22.04 LTS (推奨)
SSH接続情報: root@IPアドレス
```

### **2. ドメイン・DNS設定**
```
取得済みドメイン: あなたのドメイン名
必要なサブドメイン:
- admin.あなたのドメイン → ConoHa VPS IP
- files.あなたのドメイン → ConoHa VPS IP
```

### **3. 既存MinIO情報**
```
MinIO Endpoint: https://your-minio.com
Admin Access Key: [管理者キー]
Admin Secret Key: [管理者シークレット]
```

### **4. Google OAuth設定**
```
Google Cloud Console:
- Project ID: [作成予定]
- Client ID: [取得予定]
- Client Secret: [取得予定]
```

## 🌐 **DNS設定手順 (ConoHa DNS)**

### **ConoHa DNSでの設定方法**
```
1. ConoHaコントロールパネル → DNS
2. あなたのドメインを選択
3. Aレコード追加:
   - 名前: admin    値: [VPS IP]    TTL: 3600
   - 名前: files    値: [VPS IP]    TTL: 3600
```

### **外部DNS使用の場合**
```
お名前.com、ムームードメイン等:
admin.yourdomain.com  A  [ConoHa VPS IP]
files.yourdomain.com  A  [ConoHa VPS IP]
```

## 🔐 **Google OAuth詳細設定手順**

### **Step 1: Google Cloud Console設定**
```
1. https://console.developers.google.com/ にアクセス
2. 「新しいプロジェクト」作成
   - プロジェクト名: MinIO Access Management
3. 「APIとサービス」→「認証情報」
4. 「+ 認証情報を作成」→「OAuth 2.0 クライアントID」
```

### **Step 2: OAuth設定詳細**
```
アプリケーションの種類: ウェブアプリケーション
名前: MinIO Access Management
承認済みのリダイレクトURI:
- https://admin.yourdomain.com/api/auth/google/callback
```

### **Step 3: 認証情報取得**
```
クライアントID: [コピーしてメモ]
クライアントシークレット: [コピーしてメモ]
```

## 📧 **メール設定 (Gmail SMTP)**

### **Gmail App Password取得**
```
1. Googleアカウント設定
2. セキュリティ → 2段階認証プロセス (有効化)
3. アプリパスワード → 「メール」→「その他」
4. 「MinIO System」と入力 → 生成
5. 生成されたパスワードをメモ
```

## 🛠️ **VPSサーバー初期設定**

### **SSH接続 & 基本設定**
```bash
# ConoHa VPSにSSH接続
ssh root@[VPS_IP_ADDRESS]

# システム更新
apt update && apt upgrade -y

# 必要パッケージインストール
apt install -y git curl wget nano

# ファイアウォール設定
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw status
```

### **Docker & Docker Compose インストール**
```bash
# Docker公式インストールスクリプト
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose インストール
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 動作確認
docker --version
docker-compose --version
```

## 📁 **プロジェクトデプロイ**

### **コードダウンロード**
```bash
# プロジェクトディレクトリ作成
mkdir -p /opt/minio-access
cd /opt/minio-access

# Gitクローン (リポジトリURL要確認)
git clone https://github.com/your-username/minio-access-management.git .
```

### **環境設定ファイル作成**
```bash
# .envファイル作成
cp .env.example .env
nano .env
```

## 🔧 **本番用 .env 設定**

### **完全な設定例**
```env
# 本番環境
NODE_ENV=production

# 既存MinIO設定
MINIO_ENDPOINT=https://your-existing-minio.com
MINIO_ADMIN_ACCESS_KEY=your-minio-admin-key
MINIO_ADMIN_SECRET_KEY=your-minio-admin-secret
AWS_REGION=us-east-1

# ドメイン設定
DOMAIN_ADMIN=admin.yourdomain.com
DOMAIN_FILES=files.yourdomain.com

# 本番URL設定
NEXT_PUBLIC_ADMIN_API_BASE=https://admin.yourdomain.com/api
NEXT_PUBLIC_FILE_API_BASE=https://files.yourdomain.com/api
NEXT_PUBLIC_FILES_BASE=https://files.yourdomain.com
NEXT_PUBLIC_ADMIN_BASE=https://admin.yourdomain.com

# セキュリティ設定
SESSION_SECRET=your-super-secure-random-string-here-change-this
INVITE_TTL_MINUTES=10

# Gmail SMTP設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_ADDR=MinIO System <your-email@gmail.com>

# Google OAuth設定
GOOGLE_CLIENT_ID=your-google-client-id-from-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console
ALLOWED_EMAIL_DOMAIN=yourdomain.com

# SSL設定
SSL_EMAIL=your-email@yourdomain.com
```

## 🚀 **デプロイ実行**

### **自動デプロイコマンド**
```bash
# 依存関係セットアップ
make setup

# 本番環境デプロイ (SSL自動取得込み)
make deploy-local
```

### **手動ステップバイステップ**
```bash
# 1. Docker images ビルド
make build

# 2. SSL証明書取得
sudo ./nginx/scripts/ssl-setup.sh

# 3. サービス起動
make prod-nginx

# 4. 状態確認
make health
make status
```

## ✅ **デプロイ完了後の確認**

### **アクセステスト**
```
管理画面: https://admin.yourdomain.com
ファイル管理: https://files.yourdomain.com

初回ログイン:
- Google OAuth でログイン
- または開発者モード: admin@example.com / admin123
```

### **システムヘルスチェック**
```bash
# 全体状態確認
make health

# 詳細ログ確認
make logs

# サービス状態
docker-compose ps
```

## 🔧 **トラブルシューティング**

### **よくある問題と解決**

#### **1. DNS設定が反映されない**
```bash
# DNS確認
dig admin.yourdomain.com
nslookup admin.yourdomain.com

# 解決: 最大24時間待機、またはDNSサーバー変更
```

#### **2. SSL証明書取得失敗**
```bash
# 手動取得
sudo certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@domain.com \
  --agree-tos --no-eff-email \
  -d admin.yourdomain.com \
  -d files.yourdomain.com
```

#### **3. MinIO接続エラー**
```bash
# 接続テスト
curl -I https://your-existing-minio.com

# 設定確認
docker logs minio-admin-api
```

#### **4. Google OAuth エラー**
```bash
# リダイレクトURI確認
https://admin.yourdomain.com/api/auth/google/callback

# 設定再確認 (.env)
echo $GOOGLE_CLIENT_ID
```

## 📊 **パフォーマンス最適化**

### **ConoHa VPS推奨設定**
```bash
# スワップファイル作成 (RAM 4GB以下の場合)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 🔄 **自動バックアップ設定**

### **crontab設定**
```bash
# crontab編集
crontab -e

# 毎日AM 2:00にバックアップ
0 2 * * * cd /opt/minio-access && make backup-policies

# 週1回システム更新
0 3 * * 0 cd /opt/minio-access && git pull && make restart
```

## 📞 **次のステップ**

### **即座に必要な情報**
1. **ConoHa VPS IPアドレス**
2. **取得済みドメイン名** 
3. **既存MinIOの接続情報**
   - Endpoint URL
   - Admin Access Key
   - Admin Secret Key
4. **Gmail メールアドレス** (SMTP用)

### **Google OAuth設定完了後に必要**
5. **Google Client ID**
6. **Google Client Secret**

## 🚀 **デプロイ実行準備完了！**

上記情報を教えていただければ、即座にデプロイを実行できます。

**所要時間**: 約30分～1時間 (DNS反映時間除く)