# Commander One & MinIO Access Management 統合方法

## 現在の統合状況

### 直接接続方式 (現在利用可能)
Commander One → MinIO Server (S3 API) 

**設定方法：**
1. Commander One > Connections > Add Connection
2. Amazon S3 を選択
3. 設定値：
   ```
   Server: localhost:9000
   Access Key: minioadmin
   Secret Key: minioadmin
   Region: us-east-1
   Use SSL: OFF
   ```

### 制限事項
- システムの権限管理が適用されない
- 操作ログが記録されない
- ユーザーレベルの制御ができない

## 完全統合のためのアーキテクチャ

### 1. プロキシ統合方式

```
Commander One → File API (Port 3002) → MinIO Server
                      ↑
                権限制御・監査ログ
```

**必要な実装：**
- File API に WebDAV/S3 プロキシ機能追加
- Commander One 用の認証エンドポイント
- ユーザー別アクセス制御

### 2. 認証統合方式

**ユーザー別Access Key生成:**
```javascript
// 実装例: admin-api/routes/credentials.js
router.post('/generate-credentials', requireAuth, async (req, res) => {
  const { bucketName, permissions } = req.body;
  
  // MinIO temporary credentials generation
  const credentials = await minioClient.generatePresignedCredentials({
    bucket: bucketName,
    permissions: permissions, // ['read', 'write']
    expiry: 24 * 60 * 60 // 24 hours
  });
  
  res.json({
    accessKey: credentials.AccessKeyId,
    secretKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
    endpoint: 'http://localhost:9000',
    bucket: bucketName
  });
});
```

### 3. セキュリティ考慮事項

**本番環境での推奨設定:**
- MinIO Server は内部ネットワークに配置
- Commander One は一時認証情報を使用
- システム経由でのみアクセス許可

## 実装手順

### Phase 1: 基本統合
1. File API に S3 プロキシ機能追加
2. Commander One 用認証エンドポイント実装
3. 操作ログ記録機能

### Phase 2: 高度な統合  
1. ユーザー別一時認証情報生成
2. バケット・オブジェクトレベル権限制御
3. セッション管理とタイムアウト

### Phase 3: エンタープライズ機能
1. LDAP/AD 統合
2. 詳細監査ログ・レポート
3. ファイルバージョン管理

## Commander One 設定テンプレート

### 開発環境
```
Name: MinIO Local Development
Type: Amazon S3
Server: localhost:9000
Access Key: minioadmin
Secret Key: minioadmin
Region: us-east-1
Use SSL: No
```

### 本番環境 (システム統合後)
```  
Name: MinIO Production (via System)
Type: Amazon S3
Server: your-domain.com:9000
Access Key: [システム生成]
Secret Key: [システム生成]  
Session Token: [システム生成]
Region: us-east-1
Use SSL: Yes
```

## セキュリティ推奨事項

1. **開発環境のみ直接接続を許可**
2. **本番環境では必ずシステム経由でアクセス**
3. **定期的な認証情報ローテーション**
4. **アクセスログの監視・分析**
5. **ネットワーク分離 (MinIO内部配置)**