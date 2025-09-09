# QA Generator 生产部署指南

本指南涵盖了 QA Generator 在生产环境中的完整部署流程，包括安全配置、性能优化和监控设置。

## 📋 目录

- [系统要求](#系统要求)
- [快速部署](#快速部署)
- [详细配置](#详细配置)
- [安全设置](#安全设置)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)
- [故障排除](#故障排除)
- [维护指南](#维护指南)

## 🔧 系统要求

### 最低系统要求
- **操作系统**: Linux (Ubuntu 20.04+), macOS (10.15+), Windows Server 2019+
- **Node.js**: 18.0.0 或更高版本
- **内存**: 最少 2GB RAM，推荐 4GB+
- **存储**: 最少 10GB 可用空间
- **网络**: 稳定的互联网连接（用于AI API调用）

### 推荐生产环境规格
- **CPU**: 4核心或更多
- **内存**: 8GB RAM
- **存储**: 50GB SSD
- **网络**: 至少100Mbps带宽

## 🚀 快速部署

### 1. 克隆项目并进入目录
```bash
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator
```

### 2. 运行自动化部署脚本
```bash
chmod +x scripts/start-production.sh
./scripts/start-production.sh start
```

脚本将自动执行以下操作：
- ✅ 检查系统要求
- ✅ 设置必要目录
- ✅ 验证环境配置
- ✅ 安装依赖
- ✅ 构建应用
- ✅ 启动服务器

### 3. 验证部署
```bash
curl http://localhost:3000/api/health
```

应该返回：
```
HEALTHY
Version: 0.0.5
Uptime: 30s
Services: filesystem=healthy, memory=healthy, environment=healthy, workers=healthy
```

## ⚙️ 详细配置

### 环境变量配置

1. **创建生产环境配置文件**：
```bash
cp .env.production .env
```

2. **生成安全的API密钥**：
```bash
node scripts/generate-api-key.js --save
```

3. **配置关键环境变量**：
```bash
# 必须配置的变量
NODE_ENV=production
QA_GENERATOR_API_KEY=your_generated_api_key

# AI提供商配置（至少配置一个）
AI_PROVIDER=qianfan
QIANFAN_ACCESS_KEY=your_qianfan_access_key
QIANFAN_SECRET_KEY=your_qianfan_secret_key

# 可选配置
PORT=3000
RATE_LIMIT_PER_MINUTE=30
MAX_MEMORY_MB=2048
```

### AI提供商设置

#### QianFan (百度千帆)
```bash
QIANFAN_ACCESS_KEY=your_access_key
QIANFAN_SECRET_KEY=your_secret_key
AI_PROVIDER=qianfan
```

#### Groq
```bash
GROQ_API_KEY=your_groq_api_key
AI_PROVIDER=groq
```

#### OpenAI
```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
AI_PROVIDER=openai
```

## 🔒 安全设置

### API认证

所有API端点都需要有效的API密钥：

```bash
# 请求头方式
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/generate

# Bearer token方式
curl -H "Authorization: Bearer your_api_key" http://localhost:3000/api/generate
```

### 速率限制

默认配置：每个IP地址每分钟最多30次请求。可以通过环境变量调整：

```bash
RATE_LIMIT_PER_MINUTE=60  # 调整到每分钟60次
```

### 防火墙配置

推荐的防火墙规则：

```bash
# 允许SSH (端口22)
sudo ufw allow 22

# 允许HTTP (端口80，如果使用反向代理)
sudo ufw allow 80

# 允许HTTPS (端口443，如果使用反向代理)
sudo ufw allow 443

# 允许应用端口（仅限本地，通过反向代理访问）
sudo ufw allow from 127.0.0.1 to any port 3000

# 启用防火墙
sudo ufw enable
```

### HTTPS配置 (推荐)

使用Nginx作为反向代理：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
    }
}
```

## 📈 性能优化

### Worker池配置

根据服务器规格调整worker数量：

```bash
# 4核心服务器推荐配置
DEFAULT_WORKER_COUNT=8
MAX_WORKER_COUNT=20

# 8核心服务器推荐配置
DEFAULT_WORKER_COUNT=15
MAX_WORKER_COUNT=40
```

### 内存管理

```bash
# 设置最大内存限制
MAX_MEMORY_MB=2048

# 启用垃圾回收优化
GC_ENABLED=true

# Node.js内存选项
export NODE_OPTIONS="--max-old-space-size=2048"
```

### 进程管理

使用PM2进行生产环境进程管理：

1. **安装PM2**：
```bash
npm install -g pm2
```

2. **创建PM2配置文件** (`ecosystem.config.js`)：
```javascript
module.exports = {
  apps: [{
    name: 'qa-generator',
    script: 'npm',
    args: 'run start:next',
    cwd: '/path/to/qa-generator',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    time: true
  }]
};
```

3. **启动应用**：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📊 监控和日志

### 健康检查端点

- **基础健康检查**: `GET /api/health`
- **详细健康检查**: `POST /api/health` (需要API密钥)

### 监控指标

系统自动监控以下指标：
- 内存使用情况
- 文件系统状态
- 环境配置
- Worker系统状态
- 系统运行时间

### 日志配置

日志文件位置：
- `logs/app.log` - 应用日志
- `logs/access.log` - 访问日志
- `logs/error.log` - 错误日志

日志级别配置：
```bash
LOG_LEVEL=info  # error, warn, info, debug
STRUCTURED_LOGGING=true
SECURITY_LOGGING=true
```

### 外部监控集成

#### Prometheus监控
```bash
# 如果使用Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

#### Sentry错误追踪
```bash
SENTRY_DSN=your_sentry_dsn
```

## 🔄 运维命令

### 服务控制
```bash
# 启动服务
./scripts/start-production.sh start

# 停止服务
./scripts/start-production.sh stop

# 重启服务
./scripts/start-production.sh restart

# 查看状态
./scripts/start-production.sh status

# 健康检查
./scripts/start-production.sh health
```

### 数据管理
```bash
# 数据备份自动在启动时创建
# 手动备份
tar -czf backup_$(date +%Y%m%d).tar.gz data/

# 恢复数据
tar -xzf backup_20231201.tar.gz -C data/
```

### 日志查看
```bash
# 实时查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 搜索特定错误
grep "ERROR" logs/app.log
```

## 🛠️ 故障排除

### 常见问题

#### 1. 服务启动失败
**症状**: 服务无法启动或立即退出

**排查步骤**:
```bash
# 检查日志
cat logs/app.log

# 检查环境配置
./scripts/start-production.sh build

# 验证端口占用
lsof -i :3000
```

#### 2. API密钥错误
**症状**: 返回401 Unauthorized

**解决方案**:
```bash
# 重新生成API密钥
node scripts/generate-api-key.js --save

# 验证环境变量
echo $QA_GENERATOR_API_KEY
```

#### 3. 内存不足
**症状**: 进程被系统杀死或性能下降

**解决方案**:
```bash
# 检查内存使用
curl localhost:3000/api/health?metrics=true

# 调整内存限制
export MAX_MEMORY_MB=4096

# 重启服务
./scripts/start-production.sh restart
```

#### 4. AI API调用失败
**症状**: 生成任务失败

**排查步骤**:
```bash
# 检查API密钥配置
env | grep -E "(QIANFAN|GROQ|OPENAI)"

# 测试网络连接
curl -I https://aip.baidubce.com  # QianFan
curl -I https://api.groq.com     # Groq
curl -I https://api.openai.com   # OpenAI

# 查看错误日志
grep "API" logs/error.log
```

### 性能调优

#### CPU使用率高
```bash
# 减少worker数量
DEFAULT_WORKER_COUNT=5

# 增加处理间隔
WORKER_DELAY_MS=2000
```

#### 内存使用率高
```bash
# 启用垃圾回收
GC_ENABLED=true

# 减少批处理大小
MAX_BATCH_SIZE=25
```

## 📚 维护指南

### 定期维护任务

#### 每日
- [ ] 检查服务状态
- [ ] 查看错误日志
- [ ] 验证磁盘空间

#### 每周
- [ ] 清理旧日志文件
- [ ] 检查内存使用趋势
- [ ] 验证备份完整性

#### 每月
- [ ] 更新安全补丁
- [ ] 审查API使用情况
- [ ] 性能优化评估

### 更新部署

```bash
# 1. 备份当前版本
cp -r qa-generator qa-generator.backup

# 2. 拉取最新代码
git pull origin main

# 3. 安装新依赖
npm install --production

# 4. 构建应用
npm run build

# 5. 重启服务
./scripts/start-production.sh restart

# 6. 验证更新
curl localhost:3000/api/health
```

### 扩展部署

#### 负载均衡配置

使用Nginx进行负载均衡：

```nginx
upstream qa_generator {
    server 127.0.0.1:3000 weight=1;
    server 127.0.0.1:3001 weight=1;
    server 127.0.0.1:3002 weight=1;
}

server {
    listen 80;
    location / {
        proxy_pass http://qa_generator;
    }
}
```

#### 数据库迁移

当需要从JSON文件迁移到数据库时：

```bash
# 安装数据库依赖
npm install pg redis

# 配置数据库连接
DATABASE_URL=postgresql://user:pass@localhost:5432/qa_generator
REDIS_URL=redis://localhost:6379

# 运行迁移脚本（未来功能）
npm run migrate
```

## 🆘 支持和联系

如果遇到部署问题，请：

1. 查看本文档的故障排除部分
2. 检查 [GitHub Issues](https://github.com/FradSer/qa-generator/issues)
3. 创建新的Issue并提供：
   - 错误日志
   - 系统环境信息
   - 配置文件（删除敏感信息）

---

**版本**: v0.0.5  
**最后更新**: 2024年12月  
**文档维护**: QA Generator Team