# FixTime AI - 部署指南

## 🚀 完整部署流程

### 第一阶段：准备工作

1. **准备账号和工具**
   ```bash
   # 安装必要的工具
   npm install -g wrangler
   npm install -g vite  # 如果需要本地构建前端
   ```

2. **设置 Cloudflare**
   - 注册 Cloudflare 账号
   - 登录：`wrangler auth login`
   - 准备好域名（可选，但推荐）

3. **设置 Clerk**
   - 访问 https://clerk.com
   - 创建新应用
   - 获取以下信息：
     - Clerk Domain (如: fixtime-ai.clerk.accounts.dev)
     - Publishable Key
     - Secret Key

### 第二阶段：后端部署

1. **创建 D1 数据库**
   ```bash
   cd backend
   wrangler d1 create fixtime-db
   ```

2. **记下数据库 ID**，更新 `wrangler.toml`：
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "fixtime-db"
   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 替换为实际ID
   ```

3. **部署数据库 Schema**
   ```bash
   # 本地测试
   wrangler d1 execute fixtime-db --local --file=./schema.sql

   # 生产环境
   wrangler d1 execute fixtime-db --remote --file=./schema.sql
   ```

4. **配置环境变量**
   ```bash
   # 在 Cloudflare Dashboard > Workers & Pages > FixTime API > Settings > Variables
   CLERK_JWKS_URL = "https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json"
   ```

5. **部署后端**
   ```bash
   npm run deploy
   ```

6. **测试后端**
   ```bash
   curl https://your-worker-subdomain.workers.dev
   # 应该返回: {"status":"ok","service":"FixTime AI API",...}
   ```

### 第三阶段：前端部署

1. **更新前端配置**

   编辑 `frontend/src/App.js`，更新 API URL：
   ```javascript
   // 在文件顶部添加
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

   // 更新所有 fetch 调用使用 API_BASE_URL
   ```

2. **配置环境变量**

   创建 `frontend/.env.production`：
   ```env
   VITE_API_URL=https://your-api-domain.workers.dev
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key
   ```

3. **部署到 Cloudflare Pages**
   ```bash
   cd frontend

   # 方式1: 通过 Wrangler
   npm run build
   wrangler pages deploy dist

   # 方式2: 通过 Git (推荐)
   # 1. 推送到 GitHub
   # 2. 在 Cloudflare Dashboard 连接仓库
   # 3. 设置构建命令: npm run build
   # 4. 输出目录: dist
   ```

### 第四阶段：配置域名（可选但推荐）

1. **API 域名**
   - 在 Cloudflare Dashboard 修改 Worker 路由：
   - 添加：`api.yourdomain.com/*`

2. **前端域名**
   - 在 Pages 项目设置中添加自定义域名
   - 配置 DNS 记录

3. **更新 CORS**
   编辑 `backend/src/index.js`：
   ```javascript
   app.use('*', cors({
     origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
     // ...
   }));
   ```

### 第五阶段：最终测试

1. **功能测试清单**
   - [ ] 用户注册/登录
   - [ ] 创建第一个资产
   - [ ] 查看智能模板
   - [ ] 创建工单
   - [ ] 更新工单状态
   - [ ] 查看仪表板

2. **错误场景测试**
   - [ ] 免费用户尝试创建第4个资产
   - [ ] 无效的 JWT token
   - [ ] 访问其他用户的数据

### 📊 监控和日志

1. **查看日志**
   ```bash
   wrangler tail
   ```

2. **监控仪表板**
   - Cloudflare Dashboard > Analytics
   - D1 Database > Metrics

### 🔧 常见问题

### Q: CORS 错误
A: 确保在 `src/index.js` 中配置了正确的前端域名

### Q: Clerk 认证失败
A: 检查 JWKS URL 是否正确，确保与 Clerk 设置一致

### Q: 数据库连接错误
A: 确认 D1 数据库已创建并正确部署了 schema

### Q: 前端无法连接 API
A: 检查环境变量 `VITE_API_URL` 是否正确设置

### 📝 部署后检查清单

- [ ] 后端 API 健康检查正常
- [ ] 数据库表已创建
- [ ] 前端能正确加载
- [ ] Clerk 登录功能正常
- [ ] 创建资产功能正常
- [ ] 智能模板加载正常
- [ ] 错误信息友好清晰
- [ ] 移动端响应正常

## 🎉 完成！

部署完成后，您的 FixTime AI 应用应该可以正常运行了。用户可以：
1. 使用 Google 或邮箱注册
2. 创建最多3个免费资产
3. 使用智能模板快速设置维护计划
4. 管理工单和任务

如需升级计划，可以联系管理员手动更新用户数据库记录。