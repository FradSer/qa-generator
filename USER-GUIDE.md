# 📚 QA Generator 完整使用说明

QA Generator 是一个基于多AI提供商的智能问答生成系统，支持为中国各地区生成高质量的问题和答案。本指南将详细介绍如何安装、配置和使用该系统。

## 📋 目录

- [系统概述](#系统概述)
- [快速开始](#快速开始)
- [安装指南](#安装指南)
- [配置说明](#配置说明)
- [使用方法](#使用方法)
- [Web界面使用](#Web界面使用)
- [命令行工具](#命令行工具)
- [API接口说明](#API接口说明)
- [常见问题](#常见问题)
- [高级功能](#高级功能)
- [故障排除](#故障排除)

## 🌟 系统概述

### 主要功能
- **多AI提供商支持**：集成百度千帆、Groq、OpenAI
- **地区化内容生成**：支持中国各地区特色问答
- **并行处理**：高性能Worker池并发生成
- **智能去重**：自动检测并过滤重复和相似内容
- **Web管理界面**：现代化的管理控制台
- **API接口**：RESTful API支持集成
- **安全认证**：API密钥认证和速率限制

### 技术特性
- **TypeScript** 开发，类型安全
- **Next.js** Web框架，服务端渲染
- **Worker池** 并发处理，性能优化
- **安全第一** 输入验证、注入防护
- **容器化** Docker支持，易于部署
- **生产就绪** 监控、日志、备份

## 🚀 快速开始

### 5分钟快速体验

1. **克隆项目**
```bash
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator
```

2. **安装依赖**
```bash
# 推荐使用 Bun (更快)
bun install

# 或使用 Yarn/NPM
yarn install
# npm install
```

3. **配置环境**
```bash
# 复制配置模板
cp .env.production .env

# 生成API密钥
node scripts/generate-api-key.js --save

# 配置AI提供商 (编辑 .env 文件)
```

4. **启动系统**
```bash
# 开发模式
bun run dev

# 生产模式  
bun run build && bun run start:next
```

5. **验证运行**
```bash
# 访问Web界面
open http://localhost:3000

# 检查系统状态
curl http://localhost:3000/api/health
```

## 📦 安装指南

### 系统要求

**最低要求**：
- Node.js 18.0+
- 2GB RAM
- 10GB 存储空间
- 稳定网络连接

**推荐配置**：
- Node.js 20.0+
- 4GB RAM
- 50GB SSD
- 多核CPU

### 详细安装步骤

#### 1. 环境准备

**安装 Node.js**：
```bash
# 使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**安装包管理器 (推荐 Bun)**：
```bash
# 安装 Bun (最快)
curl -fsSL https://bun.sh/install | bash

# 或使用 Yarn
npm install -g yarn
```

#### 2. 获取源码

```bash
# 从GitHub克隆
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator

# 或下载ZIP包
wget https://github.com/FradSer/qa-generator/archive/main.zip
unzip main.zip && cd qa-generator-main
```

#### 3. 安装依赖

```bash
# 使用 Bun (推荐)
bun install

# 使用 Yarn
yarn install

# 使用 NPM
npm install
```

#### 4. 环境配置

**创建环境配置文件**：
```bash
cp .env.production .env
```

**生成安全的API密钥**：
```bash
# 生成并保存API密钥
node scripts/generate-api-key.js --save

# 查看生成的密钥
node scripts/generate-api-key.js --length 32 --format hex
```

## ⚙️ 配置说明

### 环境变量详解

打开 `.env` 文件进行配置：

#### 基本配置
```bash
# 应用环境
NODE_ENV=production          # 环境: development/production
PORT=3000                   # 服务端口
HOST=0.0.0.0               # 监听地址

# API认证 (必需)
QA_GENERATOR_API_KEY=your_generated_api_key  # API密钥
RATE_LIMIT_PER_MINUTE=30    # 每分钟请求限制
```

#### AI提供商配置

**百度千帆 (推荐，中文优化)**：
```bash
AI_PROVIDER=qianfan
QIANFAN_ACCESS_KEY=your_access_key      # 千帆访问密钥
QIANFAN_SECRET_KEY=your_secret_key      # 千帆私密密钥
```

获取千帆密钥：
1. 访问 [百度智能云控制台](https://console.bce.baidu.com/)
2. 开通千帆大模型服务
3. 创建应用获取 Access Key 和 Secret Key

**Groq (高性能)**：
```bash
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key         # Groq API密钥
```

获取Groq密钥：
1. 访问 [Groq Console](https://console.groq.com/)
2. 注册账号并创建API密钥

**OpenAI (经典选择)**：
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key     # OpenAI API密钥
OPENAI_BASE_URL=https://api.openai.com/v1  # API基础URL
```

#### 性能配置
```bash
# Worker配置
DEFAULT_WORKER_COUNT=5      # 默认Worker数量
MAX_WORKER_COUNT=20        # 最大Worker数量
WORKER_TIMEOUT_MS=300000   # Worker超时时间(5分钟)

# 内存配置
MAX_MEMORY_MB=2048         # 最大内存限制
GC_ENABLED=true           # 启用垃圾回收优化
```

#### 日志配置
```bash
# 日志级别
LOG_LEVEL=info            # 日志级别: error/warn/info/debug
STRUCTURED_LOGGING=true   # 启用结构化日志
SECURITY_LOGGING=true     # 启用安全日志
```

### 地区配置

系统内置了中国主要地区配置，可在 `config/config.ts` 中查看和修改：

```typescript
export const regions: Region[] = [
  {
    name: "赤壁",
    pinyin: "chibi", 
    description: "湖北省咸宁市赤壁市，三国赤壁之战古战场所在地"
  },
  {
    name: "常州",
    pinyin: "changzhou",
    description: "江苏省常州市"
  }
  // 更多地区...
];
```

**添加自定义地区**：
```typescript
// 在 regions 数组中添加新地区
{
  name: "你的城市名",
  pinyin: "city_pinyin",  // 英文拼音，用于文件命名
  description: "城市的详细描述"
}
```

## 🖥️ 使用方法

### Web界面使用

#### 1. 启动Web界面

```bash
# 开发模式 (热重载)
bun run dev

# 生产模式
bun run build
bun run start:next
```

访问：http://localhost:3000

#### 2. 界面功能说明

**主页面功能**：
- **地区选择**：选择要生成内容的地区
- **生成模式**：
  - `questions`: 只生成问题
  - `answers`: 为现有问题生成答案  
  - `all`: 生成问题和答案
- **参数配置**：
  - 生成数量 (1-10000)
  - Worker数量 (1-50)
  - 重试次数 (1-10)
  - 批次大小 (1-200)

**设置页面**：
- AI提供商配置
- 性能参数调整
- 日志级别设置
- 系统监控

**日志页面**：
- 实时生成日志
- 错误信息查看
- 系统状态监控

#### 3. 生成流程

1. **选择地区**：从下拉菜单选择目标地区
2. **配置参数**：设置生成数量和性能参数
3. **选择模式**：questions/answers/all
4. **开始生成**：点击"开始生成"按钮
5. **监控进度**：实时查看生成进度和日志
6. **下载结果**：生成完成后下载JSON文件

### 命令行工具

#### 基本命令格式

```bash
bun run start [options]
```

#### 参数说明

**必需参数**：
```bash
-m, --mode <type>      # 生成模式: questions|answers|all
-r, --region <name>    # 地区拼音名称
```

**可选参数**：
```bash
-c, --count <number>         # 总问题数量 (默认: 1000, 最大: 10000)
-w, --workers <number>       # Worker数量 (默认: 5, 最大: 50)
-a, --attempts <number>      # 重试次数 (默认: 3, 最大: 10)
-b, --batch <number>         # 批次大小 (默认: 50, 最大: 200)
-d, --delay <number>         # 批次间延迟(ms) (默认: 1000)
-p, --provider <name>        # AI提供商: qianfan|groq|openai
--max-q-per-worker <number>  # 每个Worker最大问题数 (默认: 50)
```

**工具命令**：
```bash
-h, --help              # 显示帮助信息
-v, --version          # 显示版本信息
-l, --list             # 列出所有可用地区
-i, --interactive      # 交互式模式
```

#### 使用示例

**1. 基础使用**：
```bash
# 为赤壁地区生成100个问题
bun run start -m questions -r chibi -c 100

# 为常州地区的现有问题生成答案
bun run start -m answers -r changzhou

# 完整流程：生成问题和答案
bun run start -m all -r chibi -c 500
```

**2. 高性能配置**：
```bash
# 使用20个Worker并发生成2000个问题
bun run start -m questions -r chibi -c 2000 -w 20

# 小批次，低延迟处理
bun run start -m questions -r chibi -c 1000 -b 25 -d 2000
```

**3. 不同AI提供商**：
```bash
# 使用Groq提供商
bun run start -m questions -r chibi -c 100 -p groq

# 使用OpenAI提供商  
bun run start -m all -r changzhou -c 200 -p openai

# 使用环境变量指定提供商
AI_PROVIDER=groq bun run start -m questions -r chibi -c 100
```

**4. 工具命令**：
```bash
# 查看帮助
bun run start --help

# 列出所有地区
bun run start --list

# 交互式模式
bun run start --interactive

# 查看版本
bun run start --version
```

#### 交互式模式

```bash
bun run start --interactive
```

系统会引导您完成配置：
```
🚀 QA Generator 交互式配置

✨ 选择生成模式:
  1) questions - 只生成问题
  2) answers - 只生成答案
  3) all - 生成问题和答案
选择 (1-3): 1

📍 选择地区:
  1) 赤壁 (chibi)
  2) 常州 (changzhou) 
选择 (1-2): 1

🔢 生成数量 (1-10000) [1000]: 500

⚡ Worker数量 (1-50) [5]: 10

🔄 重试次数 (1-10) [3]: 5

📦 批次大小 (1-200) [50]: 100

⏱️  批次延迟(ms) [1000]: 2000

🤖 AI提供商:
  1) qianfan (百度千帆)
  2) groq (Groq)
  3) openai (OpenAI)
选择 (1-3): 1

✅ 配置完成，开始生成...
```

## 🌐 API接口说明

### API认证

所有API请求需要包含API密钥：

**请求头方式**：
```bash
curl -H "X-API-Key: your_api_key" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/generate
```

**Bearer Token方式**：
```bash
curl -H "Authorization: Bearer your_api_key" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/generate
```

### 主要API端点

#### 1. 生成问答内容

**端点**：`POST /api/generate`

**请求体**：
```json
{
  "mode": "questions",
  "region": "chibi", 
  "totalCount": 100,
  "workerCount": 5,
  "maxAttempts": 3,
  "batchSize": 50,
  "delay": 1000,
  "provider": "qianfan"
}
```

**响应**：流式响应，事件格式
```
data: {"type": "log", "message": "开始生成..."}

data: {"type": "progress", "current": 50, "total": 100}

data: {"type": "success", "message": "生成完成"}

data: {"type": "end", "code": 0}
```

**cURL示例**：
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "questions",
    "region": "chibi",
    "totalCount": 50,
    "workerCount": 3
  }' \
  http://localhost:3000/api/generate
```

#### 2. 停止生成任务

**端点**：`POST /api/generate/stop`

**请求体**：无

**响应**：
```json
{
  "success": true,
  "message": "Generation process stopped successfully"
}
```

**cURL示例**：
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  http://localhost:3000/api/generate/stop
```

#### 3. 健康检查

**端点**：`GET /api/health`

**查询参数**：
- `metrics=true`: 包含详细系统指标
- `format=text`: 纯文本格式输出

**响应**：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.0.5",
  "uptime": 3600000,
  "services": {
    "filesystem": {"status": "healthy"},
    "memory": {"status": "healthy"}, 
    "environment": {"status": "healthy"},
    "workers": {"status": "healthy"}
  }
}
```

**cURL示例**：
```bash
# 基础健康检查
curl http://localhost:3000/api/health

# 包含详细指标
curl "http://localhost:3000/api/health?metrics=true"

# 纯文本格式
curl "http://localhost:3000/api/health?format=text"
```

#### 4. 地区管理

**端点**：`POST /api/regions`

**请求体**：
```json
{
  "name": "新地区",
  "pinyin": "new_region",
  "description": "新地区的描述"
}
```

**响应**：
```json
{
  "success": true
}
```

### API错误处理

**错误响应格式**：
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**常见错误代码**：
- `401`: API密钥无效或缺失
- `429`: 请求频率超限 
- `400`: 请求参数无效
- `500`: 内部服务器错误

## 💡 常见问题

### 安装配置问题

**Q: 安装依赖时报错？**
A: 确保Node.js版本18+，清理缓存后重新安装：
```bash
rm -rf node_modules package-lock.json yarn.lock
npm cache clean --force
npm install
```

**Q: API密钥生成失败？**
A: 检查Node.js是否支持crypto模块：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Q: 端口被占用？**
A: 更改端口或释放占用：
```bash
# 查看端口占用
lsof -i :3000

# 杀掉占用进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 bun run start
```

### AI提供商问题

**Q: 千帆API调用失败？**
A: 检查密钥配置和网络连接：
```bash
# 测试网络连接
curl -I https://aip.baidubce.com

# 验证密钥格式
echo "Access Key长度: ${#QIANFAN_ACCESS_KEY}"
echo "Secret Key长度: ${#QIANFAN_SECRET_KEY}"
```

**Q: Groq API额度不够？**
A: 查看Groq控制台的使用量和限制，考虑升级计划。

**Q: OpenAI API太慢？**
A: 尝试使用其他提供商或调整并发参数：
```bash
# 减少Worker数量
bun run start -m questions -r chibi -w 2 -c 100
```

### 性能问题

**Q: 内存使用过高？**
A: 调整内存限制和Worker数量：
```bash
# 设置内存限制
export MAX_MEMORY_MB=1024

# 减少Worker数量
export DEFAULT_WORKER_COUNT=3
```

**Q: 生成速度太慢？**
A: 优化并发配置：
```bash
# 增加Worker数量
bun run start -m questions -r chibi -w 10 -c 1000

# 减少延迟时间
bun run start -m questions -r chibi -d 500
```

**Q: 文件权限错误？**
A: 确保data目录可写：
```bash
mkdir -p data logs
chmod 755 data logs
```

### 生成内容问题

**Q: 生成的内容质量不高？**
A: 尝试不同的AI提供商和参数：
```bash
# 使用千帆(中文优化)
AI_PROVIDER=qianfan bun run start -m questions -r chibi

# 增加重试次数
bun run start -m questions -r chibi -a 5
```

**Q: 生成内容重复？**
A: 系统会自动去重，如果仍有重复：
1. 检查相似度算法配置
2. 增加生成批次间隔
3. 使用不同的AI提供商

**Q: 无法生成特定地区内容？**
A: 检查地区配置：
```bash
# 查看可用地区
bun run start --list

# 检查地区拼音是否正确
grep -r "your_region" config/config.ts
```

## 🎯 高级功能

### 批量地区处理

**创建批量脚本**：
```bash
#!/bin/bash
# batch-generate.sh

regions=("chibi" "changzhou" "beijing" "shanghai")
for region in "${regions[@]}"; do
  echo "开始处理 $region ..."
  bun run start -m questions -r $region -c 500 -w 5
  echo "$region 处理完成"
done
```

### 定制化提示词

**修改提示词模板**：
```typescript
// prompts/base.ts
export const questionPrompt = `
为${regionName}地区生成${count}个具有地方特色的问题。
要求：
1. 内容要准确、有价值
2. 体现地区特色和文化
3. 问题要多样化
4. 使用JSON格式返回

自定义要求：
- 添加您的特殊要求
- 调整生成风格
`;
```

### 数据分析

**分析生成结果**：
```bash
# 统计问题数量
find data -name "*_q_results.json" -exec jq '. | length' {} \;

# 分析问题长度分布
jq -r '.[].question | length' data/chibi_q_results.json | sort -n | uniq -c
```

### 集成外部系统

**通过API集成**：
```javascript
// 示例：Node.js集成
const axios = require('axios');

async function generateQuestions(region, count) {
  const response = await axios.post('http://localhost:3000/api/generate', {
    mode: 'questions',
    region: region,
    totalCount: count
  }, {
    headers: {
      'X-API-Key': 'your_api_key'
    }
  });
  
  return response.data;
}
```

### 自动化部署

**使用PM2进程管理**：
```bash
# 安装PM2
npm install -g pm2

# 创建生产环境配置
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'qa-generator',
    script: 'bun',
    args: 'run start:next',
    cwd: '/path/to/qa-generator',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# 启动应用
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

**Docker部署**：
```bash
# 构建镜像
docker build -t qa-generator .

# 运行容器
docker run -d \
  --name qa-generator \
  -p 3000:3000 \
  -e QA_GENERATOR_API_KEY=your_key \
  -e AI_PROVIDER=qianfan \
  -e QIANFAN_ACCESS_KEY=your_access_key \
  -e QIANFAN_SECRET_KEY=your_secret_key \
  -v $(pwd)/data:/app/data \
  qa-generator

# 使用Docker Compose
docker-compose up -d
```

### 监控和告警

**Prometheus监控**：
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'qa-generator'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/health'
```

**告警配置**：
```javascript
// 健康检查脚本
const axios = require('axios');

setInterval(async () => {
  try {
    const health = await axios.get('http://localhost:3000/api/health');
    if (health.data.status !== 'healthy') {
      // 发送告警
      console.error('系统状态异常:', health.data);
    }
  } catch (error) {
    console.error('健康检查失败:', error.message);
  }
}, 60000); // 每分钟检查一次
```

## 🛠️ 故障排除

### 日志分析

**查看应用日志**：
```bash
# 实时查看日志
tail -f logs/app.log

# 搜索错误
grep "ERROR" logs/app.log | tail -10

# 分析访问模式
grep "POST /api/generate" logs/access.log | wc -l
```

**日志级别调整**：
```bash
# 临时调整为debug级别
LOG_LEVEL=debug bun run start

# 永久调整 (修改.env)
echo "LOG_LEVEL=debug" >> .env
```

### 性能调优

**内存优化**：
```bash
# 启用垃圾回收
node --expose-gc app.js

# 调整内存限制
node --max-old-space-size=4096 app.js
```

**并发优化**：
```bash
# 根据CPU核心数调整Worker
WORKERS=$(nproc)
bun run start -m questions -r chibi -w $WORKERS
```

### 备份和恢复

**自动备份**：
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup_${DATE}.tar.gz" data/ .env config/
echo "备份完成: backup_${DATE}.tar.gz"
```

**恢复数据**：
```bash
# 恢复备份
tar -xzf backup_20240101_120000.tar.gz

# 验证数据完整性
find data -name "*.json" -exec jq . {} \; > /dev/null
echo "数据验证完成"
```

### 系统维护

**定期清理**：
```bash
# 清理旧日志
find logs -name "*.log" -mtime +7 -delete

# 清理临时文件
find /tmp -name "qa-generator*" -delete

# 检查磁盘空间
df -h
```

**更新系统**：
```bash
# 拉取最新代码
git pull origin main

# 更新依赖
bun install

# 重新构建
bun run build

# 重启服务
./scripts/start-production.sh restart
```

## 📞 获取帮助

### 文档资源
- **GitHub仓库**: https://github.com/FradSer/qa-generator
- **API文档**: http://localhost:3000/api/docs
- **部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **生产检查清单**: [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)

### 社区支持
- **GitHub Issues**: 报告Bug和功能请求
- **讨论区**: GitHub Discussions
- **Twitter**: @FradSer

### 商业支持
如需商业支持、定制开发或培训服务，请联系：
- **邮箱**: fradser@gmail.com
- **专业服务**: 企业级部署、性能优化、功能定制

---

**版本**: v0.0.5  
**最后更新**: 2024年12月  
**维护团队**: QA Generator Team

> 💡 **提示**: 如果本指南没有解决您的问题，请在GitHub上创建Issue，我们会及时回复和更新文档。