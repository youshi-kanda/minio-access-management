# 🚀 本番デプロイ準備チェックリスト

## 🖥️ **1. VPSサーバー準備**

### **推奨スペック**
- **CPU**: 2コア以上
- **RAM**: 4GB以上 (推奨8GB)
- **ストレージ**: 50GB以上 (SSD推奨)
- **OS**: Ubuntu 20.04/22.04 LTS または CentOS 8

### **VPS選択例**
- **さくらVPS**: 4GB プラン (月額2,200円～)
- **ConoHa VPS**: 4GB プラン (月額2,033円～)  
- **AWS EC2**: t3.medium (従量課金)
- **DigitalOcean**: 4GB Droplet ($24/月)

### **初期設定**
```bash
# rootユーザーでログイン後
apt update && apt upgrade -y
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443
```

## 🌐 **2. ドメイン・DNS設定**

### **必要なドメイン**
- **管理画面用**: `admin.yourdomain.com`
- **ファイル管理用**: `files.yourdomain.com` 
- **MinIOコンソール用**: `console.yourdomain.com` (オプション)

### **DNS Aレコード設定**
```
admin.yourdomain.com    → VPSのIPアドレス
files.yourdomain.com    → VPSのIPアドレス
console.yourdomain.com  → VPSのIPアドレス
```

### **DNS設定例 (お名前.com)**
1. DNS設定画面を開く
2. Aレコード追加：
   - ホスト名: `admin`、値: `[VPSのIP]`
   - ホスト名: `files`、値: `[VPSのIP]`

## 🔐 **3. SSL証明書 (Let's Encrypt)**

### **自動取得設定**
システムが自動で取得しますが、以下が必要：

```bash
# 事前確認
dig admin.yourdomain.com  # IPが正しく返ることを確認
dig files.yourdomain.com  # IPが正しく返ることを確認
```

### **設定ファイル更新**
```env
# .env ファイル
SSL_EMAIL=your-email@domain.com
DOMAIN_ADMIN=admin.yourdomain.com
DOMAIN_FILES=files.yourdomain.com
```

## 📧 **4. メール送信設定 (招待機能用)**

### **Gmail SMTP使用の場合**
1. Googleアカウントでアプリパスワード生成
2. 2要素認証を有効化
3. アプリパスワード作成

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 通常パスワードではなくアプリパスワード
FROM_ADDR=MinIO System <your-email@gmail.com>
```

### **SendGrid使用の場合 (推奨)**
1. SendGridアカウント作成
2. API キー生成
3. ドメイン認証設定

## 🔑 **5. Google OAuth設定 (オプション)**

### **Google Cloud Console設定**
1. https://console.developers.google.com/ にアクセス
2. 新しいプロジェクト作成
3. OAuth 2.0 クライアント作成

### **リダイレクトURI設定**
```
https://admin.yourdomain.com/api/auth/google/callback
```

### **認証情報取得**
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_EMAIL_DOMAIN=yourdomain.com  # 特定ドメインのみ許可
```

## 💾 **6. MinIOサーバー設定**

### **既存MinIOサーバーがある場合**
```env
MINIO_ENDPOINT=https://your-minio-server.com
MINIO_ADMIN_ACCESS_KEY=your-admin-key
MINIO_ADMIN_SECRET_KEY=your-admin-secret
```

### **新規MinIOサーバーの場合**
システムと一緒にデプロイされます：
```env
MINIO_ENDPOINT=http://localhost:9000
MINIO_ADMIN_ACCESS_KEY=admin
MINIO_ADMIN_SECRET_KEY=secure-random-password-here
```

## 🛠️ **7. 必要なソフトウェア (VPS側)**

### **自動インストールされるもの**
- Docker & Docker Compose
- Nginx
- Certbot (Let's Encrypt)
- Git

### **手動準備が必要なもの**
```bash
# Node.js (開発時のみ必要)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git設定
git config --global user.name "Your Name"
git config --global user.email "your-email@domain.com"
```

## 📁 **8. プロジェクトファイル準備**

### **コードのアップロード**
```bash
# VPSサーバーで実行
git clone https://github.com/your-username/minio-access-management.git
cd minio-access-management
```

### **環境設定ファイル**
```bash
# .env ファイルを本番用に設定
cp .env.example .env
# エディタで .env を編集
nano .env
```

## 🔧 **9. 本番用環境変数設定**

### **完全な .env 設定例**
```env
# 本番環境
NODE_ENV=production

# MinIO設定
MINIO_ENDPOINT=http://localhost:9000
MINIO_ADMIN_ACCESS_KEY=admin
MINIO_ADMIN_SECRET_KEY=your-secure-password-here
AWS_REGION=us-east-1

# ドメイン設定
DOMAIN_ADMIN=admin.yourdomain.com
DOMAIN_FILES=files.yourdomain.com

# URL設定
NEXT_PUBLIC_ADMIN_API_BASE=https://admin.yourdomain.com/api
NEXT_PUBLIC_FILE_API_BASE=https://files.yourdomain.com/api
NEXT_PUBLIC_FILES_BASE=https://files.yourdomain.com
NEXT_PUBLIC_ADMIN_BASE=https://admin.yourdomain.com

# セキュリティ
SESSION_SECRET=your-super-secret-session-key-change-this
INVITE_TTL_MINUTES=10

# SMTP設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_ADDR=MinIO System <your-email@gmail.com>

# Google OAuth (オプション)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_EMAIL_DOMAIN=yourdomain.com

# SSL設定
SSL_EMAIL=your-email@domain.com
```

## 🚀 **10. デプロイ実行**

### **自動デプロイコマンド**
```bash
# VPSサーバー上で実行
cd minio-access-management

# 1. 初期セットアップ
make setup

# 2. 本番デプロイ (SSL証明書込み)
make deploy-local
```

## ✅ **11. デプロイ完了後の確認**

### **動作確認URL**
- **管理画面**: https://admin.yourdomain.com
- **ファイル管理**: https://files.yourdomain.com  
- **MinIOコンソール**: https://console.yourdomain.com:9001

### **ヘルスチェック**
```bash
make health
make status
```

## 💰 **12. 費用概算**

### **月額ランニングコスト**
- **VPS**: 2,000円～4,000円/月
- **ドメイン**: 100円～300円/月  
- **SSL証明書**: 無料 (Let's Encrypt)
- **メール送信**: 無料～1,000円/月 (SendGrid)

### **初期費用**
- **ドメイン取得**: 500円～2,000円/年
- **設定作業**: 無料 (自動化済み)

## 📋 **準備完了チェックリスト**

- [ ] VPSサーバー契約・設定完了
- [ ] ドメイン取得・DNS設定完了
- [ ] メール送信設定 (Gmail/SendGrid)
- [ ] Google OAuth設定 (必要な場合)
- [ ] 既存MinIOサーバー情報 (使用する場合)
- [ ] .env ファイル設定完了
- [ ] SSH接続・Git設定完了

## 🆘 **サポート情報**

### **よくある問題**
1. **DNS設定反映**: 最大24時間かかる場合あり
2. **SSL証明書**: DNS設定完了後に取得可能
3. **メール送信**: Gmailの場合はアプリパスワード必須

### **トラブルシューティング**
```bash
# ログ確認
make logs

# サービス状態確認  
make status

# Nginx設定確認
make debug-nginx
```