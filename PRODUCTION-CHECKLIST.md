# 🚀 QA Generator 生产部署检查清单

在将 QA Generator 部署到生产环境之前，请完成以下检查清单中的所有项目。

## 📋 部署前检查清单

### ✅ 系统要求
- [ ] **操作系统**: Linux (Ubuntu 20.04+) / macOS (10.15+) / Windows Server 2019+
- [ ] **Node.js**: 版本 18.0.0 或更高
- [ ] **内存**: 最少 2GB RAM，推荐 4GB+
- [ ] **存储**: 最少 10GB 可用空间
- [ ] **网络**: 稳定的互联网连接

### 🔧 环境配置
- [ ] **环境变量文件**: 复制 `.env.production` 到 `.env`
- [ ] **API密钥生成**: 运行 `node scripts/generate-api-key.js --save`
- [ ] **AI提供商配置**: 至少配置一个AI提供商的API密钥
  - [ ] QianFan: `QIANFAN_ACCESS_KEY`, `QIANFAN_SECRET_KEY`
  - [ ] Groq: `GROQ_API_KEY`
  - [ ] OpenAI: `OPENAI_API_KEY`
- [ ] **NODE_ENV**: 设置为 `production`
- [ ] **端口配置**: 设置 `PORT` (默认: 3000)

### 🔒 安全配置
- [ ] **API认证**: `QA_GENERATOR_API_KEY` 已生成并设置
- [ ] **速率限制**: `RATE_LIMIT_PER_MINUTE` 已配置（推荐: 30）
- [ ] **防火墙配置**: 只开放必要端口
- [ ] **HTTPS配置**: 在生产环境中启用HTTPS
- [ ] **安全头**: 配置安全HTTP头部

### 📦 依赖和构建
- [ ] **依赖安装**: 运行 `yarn install --production`
- [ ] **类型检查**: 运行 `yarn typecheck`
- [ ] **应用构建**: 运行 `yarn build`
- [ ] **构建成功**: 确认没有构建错误

### 🖥️ 服务器配置
- [ ] **用户权限**: 使用非root用户运行应用
- [ ] **目录权限**: `data/`, `logs/` 目录具有正确权限
- [ ] **进程管理**: 配置PM2或类似的进程管理器
- [ ] **自动重启**: 配置系统重启时自动启动服务

### 📊 监控和日志
- [ ] **健康检查**: `/api/health` 端点正常响应
- [ ] **日志配置**: 日志级别设置为 `info`
- [ ] **日志轮转**: 配置日志轮转防止磁盘满
- [ ] **错误监控**: 配置错误追踪（如Sentry）
- [ ] **性能监控**: 配置性能监控（可选）

### 🔄 备份和恢复
- [ ] **数据备份**: 配置定期数据备份
- [ ] **配置备份**: 备份环境配置文件
- [ ] **恢复测试**: 验证备份恢复流程

### 🚀 部署验证
- [ ] **服务启动**: `./scripts/start-production.sh start`
- [ ] **健康检查**: `curl http://localhost:3000/api/health`
- [ ] **API测试**: 使用正确的API密钥测试API端点
- [ ] **内存使用**: 验证内存使用在合理范围内
- [ ] **错误日志**: 检查是否有启动错误

## 📝 部署命令参考

### 快速部署
```bash
# 1. 克隆项目
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator

# 2. 配置环境
cp .env.production .env
node scripts/generate-api-key.js --save
# 编辑 .env 文件，配置AI提供商密钥

# 3. 启动服务
./scripts/start-production.sh start
```

### 验证部署
```bash
# 检查服务状态
./scripts/start-production.sh status

# 健康检查
curl http://localhost:3000/api/health

# 查看日志
tail -f logs/app.log
```

## 🔍 故障排除快速参考

### 服务无法启动
```bash
# 查看错误日志
cat logs/app.log

# 检查端口占用
lsof -i :3000

# 验证环境配置
./scripts/start-production.sh build
```

### API认证失败
```bash
# 重新生成API密钥
node scripts/generate-api-key.js --save

# 验证环境变量
echo $QA_GENERATOR_API_KEY
```

### 内存问题
```bash
# 检查内存使用
curl localhost:3000/api/health?metrics=true

# 调整内存限制
export MAX_MEMORY_MB=4096
```

## 📞 获取帮助

如果遇到问题：

1. **查看文档**: 阅读 `DEPLOYMENT.md`
2. **检查日志**: 查看 `logs/` 目录下的日志文件
3. **GitHub Issues**: 查看或创建 GitHub Issue
4. **健康检查**: 使用 `/api/health` 端点诊断问题

## ✅ 部署完成确认

完成所有检查项后，在此签署确认：

- **部署人员**: _______________
- **部署日期**: _______________
- **服务器环境**: _______________
- **版本号**: _______________

---

**重要提醒**: 
- 🔐 永远不要将API密钥提交到版本控制系统
- 🔄 定期轮换API密钥
- 📊 监控系统资源使用情况
- 🛡️ 保持系统和依赖的最新安全补丁

部署成功后，你的QA Generator将在以下地址可用：
- **应用URL**: http://your-server:3000
- **健康检查**: http://your-server:3000/api/health
- **管理界面**: http://your-server:3000 (如果配置了)