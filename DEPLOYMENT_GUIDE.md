# License Server 部署与环境变量配置指南

## 1. 环境准备
- **Runtime**: Node.js v18+
- **Host**: Railway.app / Render.com 或任何 Node.js 托管平台

## 2. 环境变量 (Critical)
在部署平台中配置以下 key：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `V3_JWT_SECRET` | ✅ | 256-bit base64 密钥（用于签名 JWT） |
| `PORT` | ❌ | 默认 3000 |
| `V3_CORS_ORIGINS` | ❌ | 允许的来源，逗号分隔，默认 `chrome-extension://*` |
| `NODE_ENV` | ❌ | 设为 `production` 开启生产模式 |
| `STRIPE_WEBHOOK_SECRET` | ❌ | 当 Stripe 支付集成时使用 |

## 3. 部署步骤
1. 将 `backend_server` 目录上传至私有 GitHub 仓库。
2. 连接部署平台，配置环境变量。
3. Railway 会自动检测 `package.json` 并运行 `node server.js`。

## 4. 插件端对接同步
所有 13 个扩展使用统一的 `v3_auth_core.js` SDK。
部署后，在各自的 `scripts/auth.js` 中修改初始化调用：

```javascript
// 将默认的:
V3_AUTH_CORE.init('V3_XXX_PRO');
// 改为传入生产 API 地址:
V3_AUTH_CORE.init('V3_XXX_PRO', 'https://your-service.up.railway.app/api');
```

或者直接在 `v3_auth_core.js` 中改 `DEFAULT_API_BASE` 常量（全局生效）。

## 5. SaaS 项目对接
3 个 SaaS 项目（pet_booking、status_page、md_resume）的客户端 `app.js` 中硬编码了 License Server 地址 `http://localhost:3000`，部署后需替换为生产 URL。

## 6. 安全建议
- 确保 `V3_JWT_SECRET` 使用强随机密钥（可用 `openssl rand -base64 32` 生成）
- 不要在代码中硬编码 fallback 密钥（v2.0+ 已移除 fallback，启动时若未配置会报错退出）
- 定期对本地 `data/licenses.db` 文件进行异地备份
- 生产环境启用 HTTPS（托管平台通常自动处理）

## 7. 验证
部署后验证健康检查端点：
```bash
curl https://your-service.up.railway.app/health
# 预期: {"status":"healthy","timestamp":...}
```

---
**Status**: v2.0 — Ready for Cloud Deployment.
