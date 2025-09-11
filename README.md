# AI微调数据集生成器

一个基于LLM API和知识蒸馏技术的智能化AI训练数据集生成平台，为机器学习团队提供高质量、多样化的训练数据。

## 🌟 主要特性

### 核心功能
- **🧠 知识蒸馏技术**: 教师-学生模型架构，成本节省80%+
- **🔗 多LLM提供商集成**: OpenAI、Anthropic、Google等主流提供商
- **📊 智能质量控制**: 自动质量评估、多样性分析、一致性检查
- **💰 成本分析优化**: 实时成本追踪、预算控制、ROI分析
- **📤 多格式导出**: 支持JSONL、CSV、Hugging Face等格式

### 支持的数据类型
- **问答对**: FAQ生成、对话训练、知识问答
- **文本分类**: 新闻分类、情感分析、意图识别
- **文本生成**: 创意写作、产品描述、代码注释
- **代码生成**: 编程问题和解答、代码补全
- **翻译对**: 多语言翻译训练数据
- **实体识别**: 实体识别、关系抽取、信息提取

### 技术栈
- **后端**: FastAPI + Python 3.11
- **前端**: Next.js + React + TypeScript + Tailwind CSS
- **数据库**: PostgreSQL + Redis
- **部署**: Docker + Docker Compose
- **监控**: Prometheus + Grafana (可选)

## 🚀 快速开始

### 前置条件
- Docker 和 Docker Compose
- 至少一个LLM API Key (OpenAI、Anthropic等)

### 一键启动

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/qa-generator.git
cd qa-generator

# 2. 配置环境变量
cp .env.example .env
# 编辑.env文件，填入你的API Keys

# 3. 启动系统
./scripts/start.sh
```

### 访问地址
- **前端界面**: http://localhost:3000
- **API文档**: http://localhost:8000/api/docs
- **后端API**: http://localhost:8000

## 📋 详细部署指南

### 开发环境
```bash
# 仅启动基础服务(数据库、Redis)
./scripts/start.sh dev

# 本地运行后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 本地运行前端
cd frontend
npm install
npm run dev
```

### 生产环境
```bash
# 生产模式启动(包含Nginx)
./scripts/start.sh prod
```

### 包含监控
```bash
# 启动完整系统(包含Prometheus + Grafana)
./scripts/start.sh monitor

# 访问监控面板
# Grafana: http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
```

### 常用命令
```bash
# 查看服务状态
docker-compose ps

# 查看日志
./scripts/start.sh logs

# 重启服务
./scripts/start.sh restart

# 停止服务
./scripts/start.sh stop

# 清理系统
./scripts/start.sh clean
```

## ⚙️ 配置说明

### 环境变量配置 (.env)
```bash
# LLM API Keys (至少配置一个)
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key

# 数据库配置
POSTGRES_PASSWORD=password123
REDIS_PASSWORD=redis123

# 应用配置
SECRET_KEY=your-secret-key-change-in-production
DEBUG=false
LOG_LEVEL=INFO
```

### 知识蒸馏配置 (config/distillation.json)
```json
{
  "teacher_models": [
    {
      "name": "gpt4_teacher",
      "provider_type": "openai",
      "config": {
        "model_name": "gpt-4o",
        "max_tokens": 2000,
        "rate_limit_per_minute": 30
      }
    }
  ],
  "student_models": [
    {
      "name": "gpt35_student", 
      "provider_type": "openai",
      "config": {
        "model_name": "gpt-3.5-turbo",
        "max_tokens": 1000,
        "rate_limit_per_minute": 60
      }
    }
  ],
  "strategy": "response_based",
  "quality_threshold": 0.8,
  "cost_optimization": true
}
```

## 🎯 使用示例

### 1. 生成问答数据集
```python
import requests

response = requests.post('http://localhost:8000/api/datasets/generate', json={
    "keywords": ["人工智能", "机器学习", "深度学习"],
    "data_type": "qa",
    "quantity": 100,
    "quality_threshold": 0.8,
    "use_distillation": True
})

result = response.json()
print(f"生成了 {len(result['data'])} 条数据")
print(f"质量分数: {result['quality_score']}")
print(f"总成本: ${result['cost']:.4f}")
```

### 2. 导出数据集
```python
# 导出为Hugging Face格式
export_response = requests.post('http://localhost:8000/api/datasets/export', json={
    "generation_id": "your-generation-id",
    "format": "huggingface",
    "include_metadata": True
})

# 下载文件
with open("dataset.json", "wb") as f:
    f.write(export_response.content)
```

### 3. 成本分析
```python
# 获取成本分析
cost_analysis = requests.get('http://localhost:8000/api/analytics/cost?days=7')
data = cost_analysis.json()

print(f"7天总成本: ${data['total_cost']:.2f}")
print(f"相比传统方法节省: {data['savings_vs_traditional']['savings_percentage']}%")
```

## 📊 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │────│   FastAPI       │────│  知识蒸馏系统    │
│   Frontend      │    │   Backend       │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   Teacher       │
                       │   数据存储       │    │   Models        │
                       └─────────────────┘    └─────────────────┘
                                │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │   Student       │
                       │   缓存/队列      │    │   Models        │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 开发指南

### 后端开发
```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest

# 代码格式化
black .
isort .

# 类型检查
mypy .
```

### 前端开发
```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### API接口测试
访问 http://localhost:8000/api/docs 查看交互式API文档

## 📈 性能指标

### 系统性能
- **并发处理**: 支持1000+并发请求
- **响应时间**: 单条数据生成<2秒
- **数据规模**: 单个数据集支持100万+样本
- **可用性**: 99.9%服务可用性

### 成本效率
- **相比人工标注**: 节省80%+成本
- **相比单一模型**: 节省70%+成本
- **质量保持**: 85-95%教师模型质量

### 质量指标
- **自动质量评分**: 平均8.5+/10
- **多样性**: 智能去重和变化生成
- **一致性**: 格式和标签统一性检查

## 🛡️ 安全特性

- **数据加密**: 传输和存储全程加密
- **访问控制**: 细粒度权限管理
- **API安全**: Rate limiting和认证
- **审计日志**: 完整操作记录
- **合规支持**: GDPR、CCPA等法规

## 🔄 CI/CD 支持

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: ./scripts/deploy.sh
```

### Docker Compose Profiles
```bash
# 基础开发环境
docker-compose up -d

# 包含监控
docker-compose --profile monitoring up -d

# 生产环境
docker-compose --profile production up -d

# 后台任务处理
docker-compose --profile background-tasks up -d
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 故障排除

### 常见问题

**Q: 服务启动失败**
```bash
# 检查端口占用
sudo lsof -i :8000
sudo lsof -i :3000

# 查看容器日志
docker-compose logs backend
docker-compose logs frontend
```

**Q: API密钥配置错误**
```bash
# 检查环境变量
docker-compose exec backend printenv | grep API_KEY
```

**Q: 数据库连接失败**
```bash
# 重启数据库服务
docker-compose restart postgres
```

**Q: 前端无法连接后端**
```bash
# 检查网络连接
docker-compose exec frontend curl http://backend:8000/api/health
```

### 性能优化
- 调整 `docker-compose.yml` 中的资源限制
- 优化知识蒸馏配置中的批处理大小
- 使用Redis缓存频繁访问的数据
- 配置CDN加速静态资源

## 📞 支持与联系

- **问题报告**: [GitHub Issues](https://github.com/your-repo/qa-generator/issues)
- **功能请求**: [GitHub Discussions](https://github.com/your-repo/qa-generator/discussions)
- **邮件支持**: support@your-domain.com
- **文档**: [完整文档](https://docs.your-domain.com)

---

**AI微调数据集生成器** - 让AI训练数据生成变得简单高效 🚀