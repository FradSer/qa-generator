# QA Generator ![](https://img.shields.io/badge/A%20FRAD%20PRODUCT-WIP-yellow)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

English | [简体中文](README.zh-CN.md)

A sophisticated TypeScript application that leverages multiple AI providers to generate high-quality questions and answers for various topics.

## Key Features

- **Multiple AI Providers**: Seamless integration with QianFan and Groq
- **Region-based Generation**: Support for multiple regions with customizable names and descriptions
- **Diverse Content**: Generates unique questions about local history, culture, cuisine, attractions, and specialties
- **Quality Assurance**: 
  - Automatic duplicate question detection
  - Multiple retry attempts for answer generation
  - Progress auto-save after each answer
- **Flexible Configuration**: Customizable question count and answer retry attempts

## Prerequisites

Before you begin, ensure you have:
- [Bun](https://bun.sh) runtime installed
- QianFan API credentials (for QianFan provider)
- Groq API key (for Groq provider)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/FradSer/qa-generator.git
cd qa-generator
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your API keys in `.env`:
```bash
# Required for QianFan provider (default)
QIANFAN_ACCESS_KEY=your_qianfan_access_key
QIANFAN_SECRET_KEY=your_qianfan_secret_key

# Required for Groq provider
GROQ_API_KEY=your_groq_api_key
```

## Usage Guide

### Command Structure

```bash
bun run start -- <mode> <region> [options]
```

### Parameters

- `mode`: Operation mode
  - `questions`: Generate questions only
  - `answers`: Generate answers only
  - `all`: Generate both questions and answers
- `region`: Region name in pinyin (e.g., "chibi" for 赤壁)
- `options`: 
  - Questions mode: [questionCount] (default: 10)
  - Answers mode: [maxAttempts] (default: 3)

### Example Commands

1. Generate questions using default provider (QianFan):
```bash
# Generate 20 questions for Chibi
bun run start -- questions chibi 20
```

2. Generate answers using Groq:
```bash
# Generate answers for unanswered Chibi questions
AI_PROVIDER=groq bun run start -- answers chibi
```

3. Generate both questions and answers:
```bash
# Generate 15 questions and answers for Chibi using Groq
AI_PROVIDER=groq bun run start -- all chibi 15
```

### Adding New Regions

Edit `config/config.ts` to add new regions:

```typescript
export const regions: Region[] = [
  {
    name: "赤壁",
    pinyin: "chibi",
    description: "Chibi City in Xianning, Hubei Province, site of the historic Battle of Red Cliffs"
  },
  // Add new regions here
  {
    name: "New Region",
    pinyin: "newregion",
    description: "Description of the new region"
  }
];
```

### Output Files

Each region generates two JSON files:

1. Questions file: `<region>_q_results.json`
```json
[
  {
    "question": "Question text",
    "is_answered": false
  }
]
```

2. Q&A file: `<region>_qa_results.json`
```json
[
  {
    "question": "Question text",
    "content": "Answer content",
    "reasoning_content": "Reasoning process"
  }
]
```

## Project Structure

```
.
├── config/             # Configuration files
├── providers/          # AI provider implementations
│   ├── groq/          # Groq provider
│   └── qianfan/       # QianFan provider
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── index.ts           # Main entry point
```

## Error Handling

- Automatic retry for failed requests
- Progress saving after each successful answer
- Duplicate question detection and marking
- Detailed error logging

## Contributing

Issues and suggestions for improvements are welcome!
