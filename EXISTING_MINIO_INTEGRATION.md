# 🚀 既存MinIO統合デプロイ計画

## 📋 **既存環境詳細 (確認済み)**

### **インフラ情報**
```
VPS: ConoHa VPS (Ubuntu)
IP: 160.251.175.163
ドメイン: tunagu.app
DNS: Aレコード設定済み
```

### **既存MinIOサーバー**
```
S3 API: https://minio.tunagu.app (→ :9000)
Console: https://console.tunagu.app (→ :9001)
データパス: /mnt/data/minio
起動: systemd service
管理者: admin / adminpass
```

### **既存リソース**
```
バケット: noce-creative (PRIVATE)
ユーザー: testuser, tsuji01, simano01, kanda01
ポリシー: rw-noce (noce-creative 読み書き)
```

## 🎯 **統合アーキテクチャ**

### **新しいサブドメイン追加**
```
既存:
- minio.tunagu.app    → MinIO S3 API
- console.tunagu.app  → MinIO Console

新規追加:
- admin.tunagu.app    → 管理システム
- files.tunagu.app    → ファイル管理システム
```

### **システム構成**
```
┌─────────────────┐    ┌─────────────────┐
│  admin.tunagu   │    │  files.tunagu   │
│  (管理システム)   │    │  (ファイルUI)    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────┬───────────────┘
                 │
         ┌─────────────────┐
         │ 既存MinIOサーバー │
         │ minio.tunagu.app│
         │ (データそのまま)  │
         └─────────────────┘
```

## 🔧 **統合設定値**

### **環境変数 (.env)**
```env
# 本番環境
NODE_ENV=production

# 既存MinIO接続
MINIO_ENDPOINT=https://minio.tunagu.app
MINIO_ADMIN_ACCESS_KEY=admin
MINIO_ADMIN_SECRET_KEY=adminpass
MINIO_ALIAS=myminio
AWS_REGION=us-east-1

# 新サブドメイン
DOMAIN_ADMIN=admin.tunagu.app
DOMAIN_FILES=files.tunagu.app

# 本番URL
NEXT_PUBLIC_ADMIN_API_BASE=https://admin.tunagu.app/api
NEXT_PUBLIC_FILE_API_BASE=https://files.tunagu.app/api
NEXT_PUBLIC_FILES_BASE=https://files.tunagu.app
NEXT_PUBLIC_ADMIN_BASE=https://admin.tunagu.app

# セキュリティ
SESSION_SECRET=your-super-secure-random-string
INVITE_TTL_MINUTES=10

# SMTP設定 (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_ADDR=MinIO Access <your-email@gmail.com>

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_EMAIL_DOMAIN=tunagu.app

# SSL設定
SSL_EMAIL=your-email@tunagu.app
```

## 🌐 **DNS設定追加**

### **ConoHa DNS または 外部DNS**
```
既存 (そのまま):
minio.tunagu.app     A  160.251.175.163
console.tunagu.app   A  160.251.175.163

新規追加:
admin.tunagu.app     A  160.251.175.163
files.tunagu.app     A  160.251.175.163
```

## 🚀 **デプロイ手順**

### **Step 1: DNS設定**
```bash
# ConoHa DNS または お使いのDNS で追加
admin.tunagu.app   → 160.251.175.163
files.tunagu.app   → 160.251.175.163
```

### **Step 2: VPS接続・準備**
```bash
# ConoHa VPSにSSH接続
ssh root@160.251.175.163

# システム更新
apt update && apt upgrade -y

# Docker環境確認 (なければインストール)
docker --version || curl -fsSL https://get.docker.com | sh
```

### **Step 3: プロジェクトデプロイ**
```bash
# プロジェクトディレクトリ作成
mkdir -p /opt/minio-access
cd /opt/minio-access

# コードダウンロード
git clone https://github.com/your-repo/minio-access-management.git .

# 環境設定
cp .env.example .env
nano .env  # 上記設定値を入力
```

### **Step 4: SSL証明書・Nginx設定**
```bash
# SSL証明書自動取得 (新サブドメイン用)
make ssl-setup

# または手動
certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@tunagu.app \
  --agree-tos --no-eff-email \
  -d admin.tunagu.app \
  -d files.tunagu.app
```

### **Step 5: システム起動**
```bash
# 本番デプロイ実行
make deploy-local

# 状態確認
make health
make status
```

## ✅ **既存データの扱い**

### **🔒 既存リソース保護**
```
✅ 既存バケット: noce-creative → そのまま保持
✅ 既存ユーザー: testuser, tsuji01等 → そのまま継続
✅ 既存ポリシー: rw-noce → そのまま適用
✅ 既存データ: /mnt/data/minio → 無変更
```

### **📈 機能拡張**
```
新システムから:
✅ 既存ユーザーの管理・権限変更
✅ 新ユーザーの招待・作成  
✅ バケット作成・削除
✅ ファイルのWeb UI操作
✅ 詳細な監査ログ
```

## 🧪 **接続テスト**

### **既存MinIO接続確認**
```bash
# 管理システムから既存MinIOへの接続テスト
curl -I https://minio.tunagu.app
mc alias set test https://minio.tunagu.app admin adminpass
mc admin info test
```

### **既存ユーザー確認**
```bash
# 既存ユーザー一覧取得
mc admin user list test
mc admin policy list test
```

## 🎯 **完成後のアクセス方法**

### **管理者**
```
新管理画面: https://admin.tunagu.app
- Google OAuth ログイン
- ユーザー・バケット・権限管理
- 招待メール送信
- 統計・ログ確認

従来通り: https://console.tunagu.app  
- 既存のMinIO Console (技術者向け)
```

### **一般ユーザー**
```
新ファイル管理: https://files.tunagu.app
- 招待後のアカウントでログイン
- ブラウザでファイル操作
- アップロード・ダウンロード
- 共有リンク生成
```

## 🚨 **安全性確保**

### **リスク最小化**
```
✅ 既存MinIOサーバーは無変更
✅ データファイル(/mnt/data/minio)は非接触
✅ 既存ユーザー・バケットは保持
✅ 新システムは別ポートで起動
✅ 問題時は即座停止可能
```

### **バックアップ推奨**
```bash
# 念のため設定バックアップ
cp -r /mnt/data/minio /mnt/data/minio.backup.$(date +%Y%m%d)

# 既存ポリシー・ユーザー設定バックアップ
mc admin user list myminio > users_backup.txt
mc admin policy list myminio > policies_backup.txt
```

## 📞 **次のステップ**

### **即座に実施可能**
1. **DNS設定**: admin.tunagu.app, files.tunagu.app 追加
2. **Gmail設定**: アプリパスワード取得
3. **Google OAuth**: Cloud Console設定

### **準備完了後にデプロイ**
- **所要時間**: 約30分
- **ダウンタイム**: なし (既存MinIO継続稼働)
- **リスク**: 最小限 (既存環境無変更)

## 🎉 **統合のメリット**

```
現在の運用 + 新機能追加
├── 既存データ・ユーザー継続 ✅
├── 技術者向けConsole継続 ✅  
├── 一般ユーザー向けUI追加 ✅
├── メール招待システム追加 ✅
├── Google OAuth追加 ✅
└── 詳細ログ・統計追加 ✅
```

**準備が整いましたら、いつでもデプロイを実行できます！**