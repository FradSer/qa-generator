# QA 生成器

[English](README.md) | 简体中文

一个使用 Groq API 和其他来源为各种主题生成问答的 TypeScript 应用。

## 功能特点

- 支持多个地区，可配置名称和描述
- 生成关于当地历史、文化、美食、景点和特产的独特问题
- 检测并标记重复问题
- 支持多次尝试生成答案
- 每个答案生成后自动保存进度
- 可配置问题数量和答案生成尝试次数

## 环境要求

- Node.js (v14 或更高版本)
- Bun 运行时
- Groq API 密钥
- 千帆 API 凭证（可选）

## 安装设置

1. 克隆仓库
2. 安装依赖：
```bash
bun install
```
3. 基于 `.env.example` 创建 `.env` 文件：
```bash
cp .env.example .env
```
4. 在 `.env` 中配置环境变量：
```
GROQ_API_KEY=你的_groq_api_密钥            # 可选
QIANFAN_ACCESS_KEY=你的_千帆_access_key    # 可选
QIANFAN_SECRET_KEY=你的_千帆_secret_key    # 可选
```

## 使用方法

脚本可以在三种模式下运行：

1. 仅生成问题：
```bash
bun run start -- questions <地区拼音> [问题数量]
```

2. 仅生成答案（使用现有问题）：
```bash
bun run start -- answers <地区拼音> [最大尝试次数]
```

3. 同时生成问题和答案：
```bash
bun run start -- all <地区拼音> [问题数量]
```

### 参数说明

- `地区拼音`：地区的拼音名称（例如："chibi" 代表赤壁）
- `问题数量`：要生成的唯一问题数量（默认：10）
- `最大尝试次数`：每个答案的最大生成尝试次数（默认：3）

### 添加新地区

要添加新地区，编辑 `config.ts` 文件并在 `regions` 数组中添加新条目：

```typescript
export const regions: Region[] = [
  {
    name: "赤壁",
    pinyin: "chibi",
    description: "湖北省咸宁市赤壁市，三国赤壁之战古战场所在地"
  },
  // 在这里添加新地区
  {
    name: "新地区",
    pinyin: "xindiqiu",
    description: "新地区的描述"
  }
];
```

### 输出文件

每个地区会生成两个文件：

- `<地区拼音>_q_results.json`：包含生成的问题及重复检测结果
- `<地区拼音>_qa_results.json`：包含问题及其答案

### 问题格式

问题文件中的每个问题具有以下结构：
```json
{
  "question": "地区本地...",
  "is_answered": false
}
```

### 答案格式

答案文件中的每个问答对具有以下结构：
```json
{
  "question": "地区本地...",
  "content": "答案内容...",
  "reasoning_content": "思考过程..."
}
```

## 错误处理

- 脚本自动重试失败的答案生成
- 每个成功的答案生成后会保存进度
- 自动检测并标记重复问题
- 记录失败尝试的错误信息

## 贡献

欢迎提交问题和改进建议！ 