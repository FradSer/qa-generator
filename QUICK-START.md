# ⚡ QA Generator 快速开始指南

一个5分钟快速上手的简明指南，帮助您立即开始使用QA Generator。

## 🎯 3步快速开始

### 第1步：安装和配置

```bash
# 1. 克隆项目
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator

# 2. 安装依赖
npm install
# 或使用 yarn install
# 或使用 bun install (推荐，更快)

# 3. 配置环境
cp .env.production .env
node scripts/generate-api-key.js --save
```

### 第2步：配置AI提供商

编辑 `.env` 文件，配置至少一个AI提供商：

**选项1: 百度千帆 (推荐中文)**
```bash
AI_PROVIDER=qianfan
QIANFAN_ACCESS_KEY=你的千帆访问密钥
QIANFAN_SECRET_KEY=你的千帆私密密钥
```

**选项2: Groq (高性能)**
```bash
AI_PROVIDER=groq  
GROQ_API_KEY=你的groq密钥
```

**选项3: OpenAI (经典)**
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=你的openai密钥
```

### 第3步：开始使用

```bash
# 启动Web界面 (推荐新手)
npm run dev
# 然后访问: http://localhost:3000

# 或使用命令行 (高效用户)
npm run start -- -m questions -r chibi -c 100
```

## 🚀 Web界面使用 (最简单)

1. **启动服务**: `npm run dev`
2. **打开浏览器**: http://localhost:3000
3. **选择地区**: 从下拉菜单选择 (如：赤壁)
4. **设置数量**: 输入要生成的问题数量
5. **点击生成**: 坐等结果完成
6. **查看结果**: 在`data/`文件夹中找到JSON文件

## ⌨️ 命令行使用 (高效)

### 基本语法
```bash
npm run start -- -m <模式> -r <地区> -c <数量>
```

### 常用命令
```bash
# 生成100个问题
npm run start -- -m questions -r chibi -c 100

# 为现有问题生成答案  
npm run start -- -m answers -r chibi

# 完整流程：问题+答案
npm run start -- -m all -r chibi -c 50

# 查看所有可用地区
npm run start -- --list

# 交互式模式 (引导配置)
npm run start -- --interactive
```

## 📍 内置地区列表

- `chibi` - 赤壁 (湖北省咸宁市)
- `changzhou` - 常州 (江苏省)
- 更多地区请运行: `npm run start -- --list`

## 📁 输出文件位置

生成的文件保存在 `data/` 目录：
- `地区名_q_results.json` - 问题文件
- `地区名_qa_results.json` - 问答文件

示例：
- `data/chibi_q_results.json` - 赤壁地区问题
- `data/chibi_qa_results.json` - 赤壁地区问答

## 🔧 常用配置

### 性能优化
```bash
# 使用多个Worker加速 (根据CPU核心数调整)
npm run start -- -m questions -r chibi -c 500 -w 10

# 调整批处理大小
npm run start -- -m questions -r chibi -c 1000 -b 100
```

### 质量控制  
```bash
# 增加重试次数提高成功率
npm run start -- -m questions -r chibi -c 100 -a 5

# 增加批次间延迟避免限流
npm run start -- -m questions -r chibi -c 100 -d 2000
```

## ❓ 常见问题快速解决

**Q: 启动失败？**
```bash
# 检查Node.js版本 (需要18+)
node --version

# 清理并重新安装
rm -rf node_modules
npm install
```

**Q: API调用失败？**  
```bash
# 检查网络连接
ping baidu.com

# 验证API密钥配置
echo $QIANFAN_ACCESS_KEY
```

**Q: 生成内容为空？**
```bash
# 检查地区名称是否正确
npm run start -- --list

# 尝试其他AI提供商
AI_PROVIDER=groq npm run start -- -m questions -r chibi -c 10
```

**Q: 内存不足？**
```bash
# 减少Worker数量
npm run start -- -m questions -r chibi -w 2

# 减少批次大小  
npm run start -- -m questions -r chibi -b 25
```

## 🔗 获取AI提供商密钥

### 百度千帆 (推荐中文)
1. 访问 [百度智能云控制台](https://console.bce.baidu.com/)
2. 开通 "千帆大模型平台"
3. 创建应用获取 Access Key 和 Secret Key

### Groq (高性能)  
1. 访问 [Groq Console](https://console.groq.com/)
2. 注册并创建API Key

### OpenAI (经典)
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 创建API Key

## 📚 进阶学习

完整功能和高级用法请查看：
- **完整用户指南**: [USER-GUIDE.md](USER-GUIDE.md)  
- **部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **API文档**: 启动后访问 `/api/health`

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/FradSer/qa-generator/issues
- **详细文档**: 查看仓库中的完整文档
- **实时支持**: 在GitHub Discussions提问

---

**🎉 恭喜！您现在可以开始使用QA Generator了！**

建议先通过Web界面熟悉系统，然后逐步使用命令行工具提高效率。