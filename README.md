# QA Generator ![](https://img.shields.io/badge/A%20FRAD%20PRODUCT-WIP-yellow)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

English | [简体中文](README.zh-CN.md)

A sophisticated TypeScript application that leverages multiple AI providers to generate high-quality questions and answers for various regions in China. Built with a secure, service-oriented architecture and Next.js web interface.

## Key Features

- **Security First**: Input validation, injection prevention, and sensitive data protection
- **Multiple AI Providers**: Seamless integration with QianFan, Groq, and OpenAI
- **Service-Oriented Architecture**: Clean separation of concerns with dependency injection
- **Region-based Generation**: Support for multiple regions with customizable names and descriptions
- **Quality Assurance**: 
  - Automatic duplicate question detection
  - Multiple retry attempts for answer generation
  - Progress auto-save and recovery
- **Parallel Processing**: Worker pools for high-performance concurrent operations
- **Secure Logging**: Automatic sensitive data redaction and security event tracking
- **Modern Web Interface**: Built with Next.js and Tailwind CSS for administration

## Prerequisites

Before you begin, ensure you have:
- [Bun](https://bun.sh) runtime installed
- At least one AI provider configured:
  - **QianFan**: QIANFAN_ACCESS_KEY and QIANFAN_SECRET_KEY
  - **Groq**: GROQ_API_KEY
  - **OpenAI**: OPENAI_API_KEY
- Node.js 18+ (for Next.js web interface)

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
# QianFan provider (default)
QIANFAN_ACCESS_KEY=your_qianfan_access_key
QIANFAN_SECRET_KEY=your_qianfan_secret_key

# Groq provider
GROQ_API_KEY=your_groq_api_key

# OpenAI provider
OPENAI_API_KEY=your_openai_api_key

# Select AI provider (optional, defaults to qianfan)
AI_PROVIDER=qianfan  # or 'groq' or 'openai'
```

## Usage Guide

### Command Structure

```bash
# Interactive mode (recommended for new users)
bun run start --interactive

# Direct mode with parameters
bun run start --mode <type> --region <name> [options]

# Quick commands with short flags
bun run start -m questions -r chibi -c 100 -w 3
```

### Parameters

**Required Arguments:**
- `-m, --mode <type>`: Operation mode (`questions`|`answers`|`all`)
- `-r, --region <name>`: Region name in pinyin (e.g., "chibi", "changzhou")

**Optional Arguments:**
- `-c, --count <number>`: Total questions to generate (default: 1000, max: 10000)
- `-w, --workers <number>`: Number of worker threads (default: 5, max: 50)
- `--max-q-per-worker <number>`: Maximum questions per worker (default: 50)
- `-a, --attempts <number>`: Maximum retry attempts (default: 3, max: 10)
- `-b, --batch <number>`: Batch size for processing (default: 50, max: 200)
- `-d, --delay <number>`: Delay between batches in ms (default: 1000)
- `-p, --provider <name>`: AI provider (qianfan|groq|openai, default: qianfan)

**Utility Flags:**
- `-h, --help`: Show detailed help message
- `-l, --list`: List all available regions
- `-v, --version`: Show version information
- `-i, --interactive`: Interactive mode for guided setup

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

1. **Quick start with interactive mode:**
```bash
bun run start --interactive
# Follow the guided prompts to configure your generation
```

2. **List available regions:**
```bash
bun run start --list
# Shows all supported regions with descriptions
```

3. **Generate questions for a specific region:**
```bash
# Long form
bun run start --mode questions --region chibi --count 100
# Short form
bun run start -m questions -r chibi -c 100
```

4. **Generate answers for existing questions:**
```bash
bun run start -m answers -r chibi -w 3
```

5. **Full workflow with optimized settings:**
```bash
bun run start -m all -r changzhou -c 500 -w 10 -b 100 -d 2000
```

6. **High-volume processing with different providers:**
```bash
# Using Groq provider
bun run start -m questions -r chibi -c 2000 -p groq -w 15

# Using OpenAI with environment variable
AI_PROVIDER=openai bun run start -m answers -r chibi
```

7. **Conservative processing for rate-limited scenarios:**
```bash
bun run start -m all -r chibi -w 2 -d 3000 -a 5
```

### CLI Help System

The application includes comprehensive help:

```bash
# Show detailed help
bun run start --help

# List available regions  
bun run start --list

# Show version information
bun run start --version

# Interactive mode when arguments are missing
bun run start  # Automatically enters interactive mode
```

### Adding New Regions

Edit `config/config.ts` to add new regions:

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
  // Add new regions here
];
```

After adding regions, use `bun run start --list` to verify they appear correctly.

### Output Format

Each region generates two JSON files in the `data/` directory:

1. Questions file: `data/<region>_q_results.json`
```json
[
  {
    "question": "Question text",
    "is_answered": false
  }
]
```

2. Q&A file: `data/<region>_qa_results.json`
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
├── app.ts                    # Main application entry point
├── services/                 # Service layer
│   ├── storage-service.ts    # Secure file operations
│   ├── question-generation-service.ts  # Question generation logic
│   ├── answer-generation-service.ts    # Answer generation logic
│   └── provider-adapter.ts   # AI provider bridge
├── providers/                # AI provider implementations
│   ├── provider-factory.ts   # Provider management
│   ├── qianfan/              # Baidu QianFan provider
│   ├── groq/                 # Groq provider
│   └── openai/               # OpenAI provider
├── utils/                    # Security and utilities
│   ├── secure-logger.ts      # Security-aware logging
│   ├── input-validation.ts   # Input validation & security
│   ├── cli-utils.ts          # Modern CLI interface
│   └── similarity.ts         # Duplicate detection
├── workers/                  # Worker pool system
├── config/                   # Configuration files
├── types/                    # TypeScript definitions
├── app/                      # Next.js web interface
└── ARCHITECTURE.md           # Detailed architecture documentation
```

## CLI Features

The modern CLI interface provides:

**User Experience:**
- Interactive mode with guided prompts
- Short and long flag support (-m, --mode)
- Comprehensive help system with examples
- Region listing and validation
- Input validation with helpful error messages

**Developer Experience:**
- TypeScript-first CLI argument parsing
- Extensive validation and error handling
- Configuration summary before execution
- Support for both TTY and non-TTY environments

## Security & Error Handling

The application implements comprehensive security and error handling:

**Security Features:**
- Input validation and injection prevention
- Path traversal protection
- Automatic sensitive data redaction in logs
- Security event tracking and monitoring

**Error Handling:**
- Result pattern for consistent error handling
- Automatic retry with exponential backoff
- Progress checkpointing and recovery
- Graceful degradation without crashes
- Detailed logging without sensitive data exposure

## Contributing

Issues and pull requests are welcome! Feel free to contribute to improve the project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
