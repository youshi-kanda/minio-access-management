# 本番環境でのアップデート・修正手順

## 🚀 デプロイ後の修正対応

### ✅ 修正可能な項目

#### **1. フロントエンド修正**
- ✅ UI/UXの改善
- ✅ 新機能の追加
- ✅ デザイン変更
- ✅ バグ修正
- ✅ レスポンシブ対応
- ✅ 多言語対応

#### **2. バックエンド修正**
- ✅ API機能追加・改善
- ✅ 認証ロジック修正
- ✅ データベース構造変更
- ✅ パフォーマンス最適化
- ✅ セキュリティ強化
- ✅ 外部サービス統合

#### **3. 設定変更**
- ✅ 環境変数更新
- ✅ Nginx設定変更
- ✅ SSL証明書更新
- ✅ ドメイン変更
- ✅ ポート設定変更

## 🔄 アップデート手順

### **方法1: ゼロダウンタイム更新**

```bash
# 1. コード更新
git pull origin main

# 2. 依存関係更新
make setup

# 3. 段階的更新
make restart

# 4. ヘルスチェック
make health
```

### **方法2: Blue-Green デプロイ**

```bash
# 1. 新バージョンを別ポートで起動
ADMIN_API_PORT=3011 FILE_API_PORT=3012 make prod

# 2. ヘルスチェック
curl http://localhost:3011/health
curl http://localhost:3012/health

# 3. Nginxの向き先変更
# nginx/conf.d/*.conf を編集

# 4. 旧バージョン停止
make stop
```

### **方法3: Docker更新**

```bash
# 1. 新しいイメージビルド
make build

# 2. サービス更新（順次）
docker-compose up -d --no-deps frontend
docker-compose up -d --no-deps admin-api
docker-compose up -d --no-deps file-api

# 3. 確認
make health
```

## 📝 修正例別の手順

### **A. フロントエンド UI修正**

```bash
# 例: ダッシュボードにグラフ追加
# 1. ローカルで開発
cd frontend
npm run dev

# 2. 修正実装
# pages/index.tsx にグラフコンポーネント追加

# 3. 本番反映
git add . && git commit -m "Add dashboard graphs"
git push origin main

# 4. 本番サーバーで更新
ssh user@your-server
cd /path/to/project
git pull
make restart
```

### **B. 新API機能追加**

```bash
# 例: ファイル検索API追加
# 1. 開発
# admin-api/routes/search.js 作成

# 2. テスト
npm test

# 3. デプロイ
git push origin main

# 4. 本番更新
ssh user@your-server
cd /path/to/project
git pull
docker-compose restart admin-api
```

### **C. 設定変更**

```bash
# 例: OAuth設定追加
# 1. .env 更新
GOOGLE_CLIENT_ID=new-client-id
GOOGLE_CLIENT_SECRET=new-secret

# 2. サービス再起動
make restart

# 3. 確認
make health
```

## 🛡️ 安全な更新のベストプラクティス

### **1. 事前テスト**
```bash
# ローカルでテスト
make dev
npm run test

# ステージング環境でテスト
make prod
```

### **2. バックアップ**
```bash
# 設定ファイル
cp .env .env.backup.$(date +%Y%m%d)

# ポリシーファイル
make backup-policies

# データベース（必要に応じて）
# docker exec minio-server mc mirror local/bucket backup/
```

### **3. 段階的デプロイ**
```bash
# 1. 非重要サービスから
docker-compose restart frontend

# 2. APIサービス（順次）
docker-compose restart file-api
docker-compose restart admin-api

# 3. 最後にプロキシ
sudo systemctl reload nginx
```

### **4. モニタリング**
```bash
# リアルタイム監視
make monitor

# エラーログ確認
make logs

# サービス状態
make status
```

## 🔧 よくある修正シナリオ

### **シナリオ1: 新しい認証プロバイダー追加**

**修正箇所:**
- `admin-api/config/passport.js` - 新プロバイダー設定
- `frontend/pages/login.tsx` - ログインボタン追加
- `.env` - 新しい環境変数

**手順:**
```bash
# 1. 開発・テスト
git checkout -b feature/new-oauth
# ... 実装 ...
npm run test

# 2. 本番デプロイ  
git push origin feature/new-oauth
# ... PR作成・マージ ...

# 3. 本番更新
make restart
```

### **シナリオ2: UIデザイン全面刷新**

**修正箇所:**
- `frontend/styles/globals.css` - スタイル修正
- `frontend/components/*` - コンポーネント更新
- `frontend/pages/*` - ページレイアウト変更

**手順:**
```bash
# 1. Blue-Green デプロイ推奨
# 新バージョンを別ポートで起動してテスト

# 2. 問題なければ切り替え
# Nginx設定でプロキシ先変更
```

### **シナリオ3: パフォーマンス改善**

**修正箇所:**
- API レスポンス最適化
- データベースクエリ改善
- キャッシュ機能追加

**手順:**
```bash
# 1. 段階的適用
docker-compose restart admin-api
# 監視・確認
docker-compose restart file-api
# 監視・確認
```

## 📊 アップデート影響度

| 修正種類 | 影響度 | ダウンタイム | 推奨手順 |
|---------|--------|-------------|---------|
| フロントエンドUI | 低 | なし | 直接更新 |
| API機能追加 | 中 | 数秒 | 段階的更新 |
| 認証システム変更 | 高 | 1-2分 | Blue-Green |
| データベース変更 | 高 | 5-10分 | メンテナンス時間 |
| 設定変更 | 低-中 | 数秒 | 設定リロード |

## 🚨 緊急時の対応

### **ロールバック手順**
```bash
# 1. 前バージョンに戻す
git checkout HEAD~1
make restart

# 2. または直接コンテナ操作
docker-compose restart
```

### **緊急停止**
```bash
# 全サービス停止
make stop

# 特定サービスのみ
docker-compose stop admin-api
```

## 🎯 まとめ

**✅ 本番デプロイ後も柔軟に修正可能**
- フロントエンド、バックエンド、設定すべて更新可能
- ダウンタイム最小化の仕組みあり
- 自動化されたデプロイプロセス
- 安全なロールバック機能

**🔄 継続的改善が可能な設計**
- Docker化による環境統一
- Git連携による版数管理
- 段階的更新による安全性確保
- モニタリング・ログ機能