# QA 生成器 ![](https://img.shields.io/badge/A%20FRAD%20PRODUCT-WIP-yellow)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

[English](README.md) | 简体中文

一个强大的 TypeScript 应用程序，利用多个 AI 提供商为各种主题生成高质量的问答内容。

## 核心功能

- **多 AI 提供商支持**：无缝集成千帆和 Groq
- **基于地区生成**：支持多个地区，可自定义名称和描述
- **丰富的内容**：生成关于当地历史、文化、美食、景点和特产的独特问题
- **质量保证**：
  - 自动检测重复问题
  - 答案生成多次重试机制
  - 答案生成后自动保存进度
- **灵活配置**：可自定义问题数量和答案重试次数

## 环境要求

开始之前，请确保您已准备：
- [Bun](https://bun.sh) 运行时环境
- 千帆 API 凭证（使用千帆提供商时需要）
- Groq API 密钥（使用 Groq 提供商时需要）

## 快速开始

1. 克隆仓库：
```bash
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator
```

2. 安装依赖：
```bash
bun install
```

3. 设置环境变量：
```bash
cp .env.example .env
```

4. 在 `.env` 中配置 API 密钥：
```bash
# Required for QianFan provider (default)
QIANFAN_ACCESS_KEY=your_qianfan_access_key
QIANFAN_SECRET_KEY=your_qianfan_secret_key

# Required for Groq provider
GROQ_API_KEY=your_groq_api_key
```

## 使用指南

### 命令结构

```bash
bun run start -- <模式> <地区> [选项]
```

### 参数说明

- `模式`：运行模式
  - `questions`：仅生成问题
  - `answers`：仅生成答案
  - `all`：同时生成问题和答案
- `地区`：地区拼音（如 "chibi" 代表赤壁）
- `选项`：
  - 问题模式：问题数量 [questionCount]（默认：10）
  - 答案模式：最大重试次数 [maxAttempts]（默认：3）

### 示例命令

1. 使用默认提供商（千帆）生成问题：
```bash
# 为赤壁生成 20 个问题
bun run start -- questions chibi 20
```

2. 使用 Groq 生成答案：
```bash
# 为赤壁的未回答问题生成答案
AI_PROVIDER=groq bun run start -- answers chibi
```

3. 同时生成问题和答案：
```bash
# 使用 Groq 为赤壁生成 15 个问题及其答案
AI_PROVIDER=groq bun run start -- all chibi 15
```

### 添加新地区

编辑 `config/config.ts` 文件添加新地区：

```typescript
export const regions: Region[] = [
  {
    name: "赤壁",
    pinyin: "chibi",
    description: "湖北省咸宁市赤壁市，三国赤壁之战古战场所在地"
  },
  // 在此添加新地区
  {
    name: "新地区",
    pinyin: "xindiqiu",
    description: "新地区的描述"
  }
];
```

### 输出文件

每个地区会生成两个 JSON 文件：

1. 问题文件：`<地区>_q_results.json`
```json
[
  {
    "question": "问题内容",
    "is_answered": false
  }
]
```

2. 问答文件：`<地区>_qa_results.json`
```json
[
  {
    "question": "问题内容",
    "content": "答案内容",
    "reasoning_content": "思考过程"
  }
]
```

## 项目结构

```
.
├── config/             # 配置文件
├── providers/          # AI 提供商实现
│   ├── groq/          # Groq 提供商
│   └── qianfan/       # 千帆提供商
├── types/             # TypeScript 类型定义
├── utils/             # 工具函数
└── index.ts           # 主入口文件
```

## 错误处理

- 失败请求自动重试
- 答案生成成功后自动保存进度
- 自动检测并标记重复问题
- 详细的错误日志记录

## 贡献

欢迎提交问题和改进建议！ 