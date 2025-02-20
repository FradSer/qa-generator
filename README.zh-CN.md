# QA 生成器 ![](https://img.shields.io/badge/A%20FRAD%20PRODUCT-WIP-yellow)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

[English](README.md) | 简体中文

一款基于多种 AI 模型的智能问答生成工具，专注于为中国各地区生成高质量的本地特色问答内容。

## 主要特性

- **多模型支持**：目前已集成百度千帆和 Groq 两大 AI 模型
- **地区特色**：支持为不同地区定制化生成问答内容，可自定义地区名称和描述
- **内容丰富**：涵盖地方历史、文化、美食、景点和特产等多个维度
- **质量保障**：
  - 智能去重，避免重复问题
  - 答案生成失败自动重试
  - 实时保存生成进度
- **灵活配置**：可自定义问题数量和重试次数
- **多线程处理**：利用多线程并行处理，提升生成效率

## 运行环境

使用前请确保：
- 已安装 [Bun](https://bun.sh) 运行环境
- 有百度千帆 API 密钥（使用千帆模型时需要）
- 有 Groq API 密钥（使用 Groq 模型时需要）

## 快速上手

1. 克隆项目：
```bash
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator
```

2. 安装依赖：
```bash
bun install
```

3. 配置环境变量：
```bash
cp .env.example .env
```

4. 在 `.env` 中填写 API 密钥：
```bash
# Required for QianFan provider (default)
QIANFAN_ACCESS_KEY=your_qianfan_access_key
QIANFAN_SECRET_KEY=your_qianfan_secret_key

# Required for Groq provider
GROQ_API_KEY=your_groq_api_key
```

## 使用说明

### 命令格式

```bash
bun run start [参数]
```

### 参数说明

必需参数：
- `--mode <类型>`：运行模式
  - `questions`：仅生成问题
  - `answers`：仅生成答案
  - `all`：同时生成问题和答案
- `--region <名称>`：地区拼音（如 "chibi" 代表赤壁）

可选参数：
- `--count <数字>`：生成问题数量（默认：100）
- `--workers <数字>`：工作线程数（默认：CPU核心数-1）
- `--attempts <数字>`：最大重试次数（默认：3）
- `--batch <数字>`：批处理大小（默认：50）
- `--delay <数字>`：批次间延迟（毫秒）（默认：1000）

### 使用示例

1. 为特定地区生成问题：
```bash
bun run start --mode questions --region chibi --count 50
```

2. 为已有问题生成答案：
```bash
bun run start --mode answers --region chibi
```

3. 同时生成问题和答案：
```bash
bun run start --mode all --region chibi --count 100
```

4. 使用 Groq 模型：
```bash
AI_PROVIDER=groq bun run start --mode all --region chibi
```

### 添加新地区

在 `config/config.ts` 中添加新地区配置：

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
    "reasoning_content": "推理过程"
  }
]
```

## 项目结构

```
.
├── config/            # 配置文件
├── generators/        # 问答生成器
├── providers/         # AI 模型接入
│   ├── groq/          # Groq 模型
│   └── qianfan/       # 千帆模型
├── prompts/           # AI 提示词模板
├── types/             # TypeScript 类型定义
├── utils/             # 工具函数
├── workers/           # 多线程处理
└── index.ts           # 主程序入口
```

## 错误处理

- API 调用失败自动重试
- 答案生成后自动保存进度
- 智能检测并过滤重复问题
- 详细的错误日志和堆栈追踪

## 参与贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目！ 