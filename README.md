# QA Generator ![](https://img.shields.io/badge/A%20FRAD%20PRODUCT-WIP-yellow)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

English | [简体中文](README.zh-CN.md)

A sophisticated TypeScript application that leverages multiple AI providers to generate high-quality questions and answers for various regions in China. Built with Next.js and Tailwind CSS for a modern web interface.

## Key Features

- **Multiple AI Providers**: Seamless integration with QianFan and Groq
- **Region-based Generation**: Support for multiple regions with customizable names and descriptions
- **Diverse Content**: Generates unique questions about local history, culture, cuisine, attractions, and specialties
- **Quality Assurance**: 
  - Automatic duplicate question detection
  - Multiple retry attempts for answer generation
  - Progress auto-save after each answer
- **Flexible Configuration**: Customizable question count and answer retry attempts
- **Multi-threaded Processing**: Parallel processing with worker threads for improved performance
- **Intelligent Output**: Structured JSON output with questions, answers, and reasoning content
- **Modern Web Interface**: Built with Next.js and Tailwind CSS for a beautiful, responsive UI

## Prerequisites

Before you begin, ensure you have:
- [Bun](https://bun.sh) runtime installed
- QianFan API credentials (for QianFan provider)
- Groq API key (for Groq provider)
- Node.js 18+ (for Next.js development)

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
bun run start [options]
```

### Parameters

Required options:
- `--mode <type>`: Operation mode
  - `questions`: Generate questions only
  - `answers`: Generate answers only
  - `all`: Generate both questions and answers
- `--region <n>`: Region name in pinyin (e.g., "chibi" for 赤壁)

Optional parameters:
- `--count <number>`: Number of questions to generate (default: 100)

Worker-related parameters:
- `--workers <number>`: Number of worker threads (default: CPU cores - 1)
- `--batch <number>`: Batch size for processing (default: 50)
- `--delay <number>`: Delay between batches in milliseconds (default: 1000)
- `--attempts <number>`: Maximum retry attempts per task (default: 3)

### Web Interface

To start the Next.js development server:

```bash
bun run dev
```

Visit `http://localhost:3000` to access the web interface.

### Worker System

The application leverages a multi-threaded worker system for parallel processing:

- **Architecture**:
  - Tasks are evenly distributed among worker threads
  - Each worker processes its assigned batch independently
  - Workers are automatically cleaned up after task completion
  - Error isolation prevents cascading failures

- **Performance Optimization**:
  - Adjust thread count based on your CPU (`--workers`)
  - Fine-tune batch size for optimal throughput (`--batch`)
  - Control API rate limiting with delays (`--delay`)
  - Set retry attempts for failed tasks (`--attempts`)

Example with optimized worker configuration:
```bash
bun run start --mode all --region chibi --workers 20 --batch 25 --delay 2000
```

### Example Commands

1. Generate questions for a specific region:
```bash
bun run start --mode questions --region chibi --count 50
```

2. Generate answers for existing questions:
```bash
bun run start --mode answers --region chibi
```

3. Generate both questions and answers:
```bash
bun run start --mode all --region chibi --count 100
```

4. Use Groq as AI provider:
```bash
AI_PROVIDER=groq bun run start --mode all --region chibi
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

### Output Format

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
    "reasoning_content": "Reasoning process and references"
  }
]
```

## Project Structure

```
.
├── app/             # Next.js application files
├── config/          # Configuration files
├── generators/      # Question and answer generators
├── providers/       # AI provider implementations
│   ├── groq/        # Groq provider
│   └── qianfan/     # QianFan provider
├── prompts/         # AI prompt templates
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── workers/         # Worker thread implementations
└── index.ts         # Main entry point
```

## Error Handling

The application implements robust error handling:
- Automatic retry for failed API requests
- Progress saving after each successful answer
- Duplicate question detection and filtering
- Detailed error logging with stack traces
- Graceful failure recovery with state preservation

## Contributing

Issues and pull requests are welcome! Feel free to contribute to improve the project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
