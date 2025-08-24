# MinIO Access Management System

完全なMinIOアクセス管理システム - GUIベースのユーザー・バケット管理、ファイルブラウザ、招待システムを含む

## 🚀 機能

### 管理機能
- **バケット管理**: 作成、削除、権限設定、バージョニング
- **ユーザー管理**: 作成、有効化/無効化、グループ管理
- **招待システム**: メールベースのユーザー招待・アカウント作成
- **ポリシー管理**: きめ細かいアクセス制御
- **監査ログ**: すべての操作の追跡

### ファイル操作
- **ファイルブラウザ**: Web UIでのファイル操作
- **アップロード/ダウンロード**: ドラッグ&ドロップサポート
- **プレビュー**: 画像・動画・テキストファイル
- **共有リンク**: 期限付きダウンロードリンク
- **フォルダ管理**: 階層的なファイル組織

### 認証・セキュリティ
- **Google OAuth 2.0**: ドメイン制限対応
- **セッション管理**: 複数サービス間での共有認証
- **HTTPS/SSL**: Let's Encrypt自動証明書
- **レート制限**: API保護

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Admin API     │    │   File API      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Express)     │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │   mc admin      │    │   AWS S3 SDK    │
         │              │   (CLI Wrapper) │    │   (File Ops)    │
         │              └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       └───────┬───────────────┘
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────────────┐
│                MinIO Server                              │
│                (S3 Compatible)                          │
└─────────────────────────────────────────────────────────┘
```

## 📦 クイックスタート

### 必要条件
- Node.js 16+
- Docker & Docker Compose
- MinIO Server (Community Edition)

### 1. セットアップ & 起動
```bash
# 1. 依存関係インストール
make setup

# 2. 環境設定（.env ファイルを編集）
cp .env.example .env

# 3. 開発環境起動
make dev
```

### 2. アクセス
- **管理画面**: http://localhost:3000
- **ファイル管理**: http://localhost:3000 (同一アプリ)
- **Admin API**: http://localhost:3001
- **File API**: http://localhost:3002

### 3. 初回ログイン
- **開発環境**: `admin@example.com` / `admin123`
- **本番環境**: Google OAuth

## 🔧 主要コマンド

```bash
# 開発環境
make dev              # 全サービス起動
make dev-local        # Docker未使用で起動
make logs            # ログ表示
make stop            # 停止

# 本番環境
make prod            # 本番環境起動
make deploy-local    # Nginx + SSL付きデプロイ

# テスト・監視
make test           # 全テスト実行
make health         # ヘルスチェック
make clean          # クリーンアップ
```

## 🐳 本番デプロイ (VPS)

### 1. サーバー準備
```bash
# Docker インストール
curl -fsSL https://get.docker.com | sh

# プロジェクト配置
git clone <repository-url>
cd minio-access-management
```

### 2. 環境設定
```bash
# 本番環境変数設定
cp .env.example .env
# 以下を本番用に編集:
# - MINIO_ENDPOINT (本番MinIOサーバー)
# - GOOGLE_CLIENT_ID/SECRET (OAuth用)
# - SMTP_* (メール送信用)
# - ドメイン設定
```

### 3. SSL証明書 + デプロイ
```bash
# DNS A レコード設定後
make deploy-local
```

### 4. URL生成
デプロイ完了後、以下のURLでアクセス可能:
- **管理画面**: https://admin.tunagu.app
- **ファイル管理**: https://files.tunagu.app

## 🔒 セキュリティ設定

### Google OAuth設定
1. [Google Cloud Console](https://console.developers.google.com/) でプロジェクト作成
2. OAuth 2.0 クライアント ID 作成
3. 承認済みリダイレクト URI:
   - `https://admin.yourdomain.com/api/auth/google/callback`

### ドメイン制限
```bash
# .env でドメイン制限
ALLOWED_EMAIL_DOMAIN=yourdomain.com
```

## 📝 使用方法

### 管理者
1. **ログイン** → Google OAuth または開発認証
2. **バケット作成** → 名前・権限・バージョニング設定
3. **ユーザー招待** → メール送信 → 受信者がアカウント作成

### エンドユーザー
1. **招待メール受信** → リンククリック
2. **パスワード設定** → アカウント作成完了
3. **ファイル操作** → アップロード・ダウンロード・共有

## 🧪 テスト

### 包括テスト
```bash
npm test  # デプロイメントテスト実行
```

### 単体テスト
```bash
npm run test-unit  # API単体テスト
```

### ヘルスチェック
```bash
make health  # 全サービス状態確認
```

## 📁 プロジェクト構造

```
minio-access-management/
├── admin-api/           # 管理API (Express + mc admin)
├── file-api/            # ファイルAPI (Express + S3 SDK)
├── frontend/            # フロントエンド (Next.js)
├── nginx/               # リバースプロキシ設定
├── policies/            # MinIOポリシーファイル
├── docker-compose.yml   # 本番環境設定
├── Makefile            # 便利コマンド
├── test-deployment.js  # デプロイテスト
└── README.md           # このファイル
```

## 🚀 URL生成・公開方法

### 開発環境から本番環境へ

1. **VPSサーバー準備** (Ubuntu/CentOS等)
2. **ドメイン設定** - DNS A レコード設定
3. **デプロイ実行** - `make deploy-local`
4. **SSL自動設定** - Let's Encrypt証明書取得
5. **URL生成完了** - HTTPS対応の管理・ファイルURL

### カスタムドメイン設定
`.env` ファイルで独自ドメインを設定:
```bash
DOMAIN_ADMIN=admin.yourdomain.com
DOMAIN_FILES=files.yourdomain.com
```

## 🐛 トラブルシューティング

### よくある問題
- **MinIO接続エラー** → `MINIO_ENDPOINT` 確認
- **OAuth失敗** → Google Console設定確認
- **メール送信失敗** → SMTP設定確認

### デバッグ
```bash
make debug-nginx  # Nginx設定確認
make monitor      # リアルタイムログ
```

## 📞 サポート

- **GitHub Issues**: [Issues](https://github.com/your-org/minio-access-management/issues)
- **Wiki**: [Documentation](https://github.com/your-org/minio-access-management/wiki)

---

**🎉 MinIO Access Management System** - 完全なS3互換ストレージ管理ソリューション