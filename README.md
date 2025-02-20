# QA Generator ![](https://img.shields.io/badge/A%20FRAD%20PRODUCT-WIP-yellow)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

English | [简体中文](README.zh-CN.md)

A TypeScript application that generates questions and answers for various topics using the Groq API and other sources.

## Features

- Supports multiple regions with configurable names and descriptions
- Generates unique questions about local history, culture, food, attractions, and specialties
- Detects and marks duplicate questions
- Supports multiple attempts for answer generation
- Saves progress after each answer
- Configurable number of questions and answer attempts

## Prerequisites

- Node.js (v14 or later)
- Bun runtime
- Groq API key
- Qianfan API credentials (optional)

## Setup

1. Clone the repository
2. Install dependencies:
```bash
bun install
```
3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
4. Configure your environment variables in `.env`:
```
GROQ_API_KEY=your_groq_api_key                # Optional
QIANFAN_ACCESS_KEY=your_qianfan_access_key    # Optional
QIANFAN_SECRET_KEY=your_qianfan_secret_key    # Optional
```

## Usage

The script can be run in three modes:

1. Generate questions only:
```bash
bun run start -- questions <region_pinyin> [questionCount]
```

2. Generate answers only (using existing questions):
```bash
bun run start -- answers <region_pinyin> [maxAttempts]
```

3. Generate both questions and answers:
```bash
bun run start -- all <region_pinyin> [questionCount]
```

### Parameters

- `region_pinyin`: Pinyin name of the region (e.g., "chibi" for 赤壁)
- `questionCount`: Number of unique questions to generate (default: 10)
- `maxAttempts`: Maximum number of attempts for each answer (default: 3)

### Adding New Regions

To add a new region, edit the `config.ts` file and add a new entry to the `regions` array:

```typescript
export const regions: Region[] = [
  {
    name: "赤壁",
    pinyin: "chibi",
    description: "湖北省咸宁市赤壁市，三国赤壁之战古战场所在地"
  },
  // Add your new region here
  {
    name: "新地区",
    pinyin: "xindiqiu",
    description: "新地区的描述"
  }
];
```

### Output Files

For each region, two files will be generated:

- `<region_pinyin>_q_results.json`: Contains generated questions with duplicate detection
- `<region_pinyin>_qa_results.json`: Contains questions and their answers

### Question Format

Each question in the questions file has the following structure:
```json
{
  "question": "地区本地...",
  "is_answered": false
}
```

### Answer Format

Each QA pair in the answers file has the following structure:
```json
{
  "question": "地区本地...",
  "content": "答案内容...",
  "reasoning_content": "思考过程..."
}
```

## Error Handling

- The script automatically retries failed answer attempts
- Progress is saved after each successful answer
- Duplicate questions are detected and marked
- Failed attempts are logged with error messages

## Contributing

Feel free to submit issues and enhancement requests!
