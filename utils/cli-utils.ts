/**
 * Modern CLI utilities for QA Generator
 */

import { regions, getRegionByPinyin, type Region } from '../config/config';
import { ValidationError } from './input-validation';

/**
 * CLI argument configuration
 */
export interface CLIArguments {
  mode?: 'questions' | 'answers' | 'all';
  region?: string;
  count?: string;
  workers?: string;
  'max-q-per-worker'?: string;
  attempts?: string;
  batch?: string;
  delay?: string;
  provider?: string;
  help?: boolean;
  list?: boolean;
  version?: boolean;
  interactive?: boolean;
}

/**
 * Parsed and validated CLI configuration
 */
export interface CLIConfig {
  mode: 'questions' | 'answers' | 'all';
  region: Region;
  count: number;
  workers: number;
  maxQPerWorker: number;
  attempts: number;
  batch: number;
  delay: number;
  provider: string;
}

/**
 * CLI argument parser with modern features
 */
export class CLIParser {
  private args: string[];
  
  constructor(args: string[] = process.argv.slice(2)) {
    this.args = args;
  }

  /**
   * Parse command line arguments
   */
  parse(): CLIArguments {
    const parsed: CLIArguments = {};
    
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      if (this.handleFlagArgument(arg, parsed)) {
        continue;
      }
      
      const nextArg = this.args[i + 1];
      const keyValueResult = this.handleKeyValueArgument(arg, nextArg, parsed);
      
      if (keyValueResult.processed) {
        i++; // Skip the value in next iteration
      }
    }
    
    return parsed;
  }

  /**
   * Type-safe method to set argument values
   */
  private setArgValue(parsed: CLIArguments, key: string, value: string): void {
    switch (key) {
      case 'mode':
        parsed.mode = value as 'questions' | 'answers' | 'all';
        break;
      case 'region':
        parsed.region = value;
        break;
      case 'count':
        parsed.count = value;
        break;
      case 'workers':
        parsed.workers = value;
        break;
      case 'max-q-per-worker':
        parsed['max-q-per-worker'] = value;
        break;
      case 'attempts':
        parsed.attempts = value;
        break;
      case 'batch':
        parsed.batch = value;
        break;
      case 'delay':
        parsed.delay = value;
        break;
      case 'provider':
        parsed.provider = value;
        break;
      default:
        // Log unknown argument but don't error to maintain flexibility
        console.warn(`Unknown argument: --${key}`);
    }
  }

  /**
   * Handle flag arguments (without values)
   */
  private handleFlagArgument(arg: string, parsed: CLIArguments): boolean {
    const flagMappings = {
      '--help': 'help', '-h': 'help',
      '--list': 'list', '-l': 'list',
      '--version': 'version', '-v': 'version',
      '--interactive': 'interactive', '-i': 'interactive'
    };
    
    const flagName = flagMappings[arg as keyof typeof flagMappings];
    if (flagName) {
      (parsed as any)[flagName] = true;
      return true;
    }
    
    return false;
  }

  /**
   * Handle key-value arguments
   */
  private handleKeyValueArgument(
    arg: string, 
    nextArg: string, 
    parsed: CLIArguments
  ): {processed: boolean} {
    if (arg.startsWith('--')) {
      return this.processLongFlag(arg, nextArg, parsed);
    } else if (arg.startsWith('-')) {
      return this.processShortFlag(arg, nextArg, parsed);
    }
    
    return {processed: false};
  }

  /**
   * Process long flag (--key value)
   */
  private processLongFlag(
    arg: string, 
    value: string, 
    parsed: CLIArguments
  ): {processed: boolean} {
    const key = arg.slice(2);
    
    if (!value || value.startsWith('--')) {
      throw new ValidationError(`Missing value for argument: --${key}`);
    }
    
    this.setArgValue(parsed, key, value);
    return {processed: true};
  }

  /**
   * Process short flag (-k value)
   */
  private processShortFlag(
    arg: string, 
    value: string, 
    parsed: CLIArguments
  ): {processed: boolean} {
    const key = this.mapShortFlag(arg);
    
    if (!value || value.startsWith('-')) {
      throw new ValidationError(`Missing value for argument: ${arg}`);
    }
    
    this.setArgValue(parsed, key, value);
    return {processed: true};
  }

  /**
   * Map short flags to long flags
   */
  private mapShortFlag(flag: string): string {
    const mapping: Record<string, string> = {
      '-m': 'mode',
      '-r': 'region',
      '-c': 'count',
      '-w': 'workers',
      '-a': 'attempts',
      '-b': 'batch',
      '-d': 'delay',
      '-p': 'provider'
    };
    
    return mapping[flag] || flag.slice(1);
  }

  /**
   * Validate and convert CLI arguments to configuration
   */
  static validateAndConvert(args: CLIArguments): CLIConfig {
    // Check required arguments
    if (!args.mode) {
      throw new ValidationError('Missing required argument: --mode (-m)');
    }
    
    if (!args.region) {
      throw new ValidationError('Missing required argument: --region (-r)');
    }

    // Validate mode
    const validModes = ['questions', 'answers', 'all'];
    if (!validModes.includes(args.mode)) {
      throw new ValidationError(`Invalid mode: ${args.mode}. Valid modes: ${validModes.join(', ')}`);
    }

    // Validate region
    const region = getRegionByPinyin(args.region);
    if (!region) {
      const availableRegions = regions.map(r => r.pinyin).join(', ');
      throw new ValidationError(`Invalid region: ${args.region}. Available regions: ${availableRegions}`);
    }

    // Parse and validate numeric arguments with defaults
    const config: CLIConfig = {
      mode: args.mode,
      region,
      count: CLIParser.parseNumber(args.count, 1000, 'count', 1, 10000),
      workers: CLIParser.parseNumber(args.workers, 5, 'workers', 1, 50),
      maxQPerWorker: CLIParser.parseNumber(args['max-q-per-worker'], 50, 'max-q-per-worker', 1, 500),
      attempts: CLIParser.parseNumber(args.attempts, 3, 'attempts', 1, 10),
      batch: CLIParser.parseNumber(args.batch, 50, 'batch', 1, 200),
      delay: CLIParser.parseNumber(args.delay, 1000, 'delay', 0, 10000),
      provider: args.provider || process.env.AI_PROVIDER || 'qianfan'
    };

    // Validate provider
    const validProviders = ['qianfan', 'groq', 'openai'];
    if (!validProviders.includes(config.provider)) {
      throw new ValidationError(`Invalid provider: ${config.provider}. Valid providers: ${validProviders.join(', ')}`);
    }

    return config;
  }

  /**
   * Parse and validate numeric argument
   */
  private static parseNumber(value: string | undefined, defaultValue: number, name: string, min: number, max: number): number {
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new ValidationError(`Invalid ${name}: ${value}. Must be a number.`);
    }
    
    if (parsed < min || parsed > max) {
      throw new ValidationError(`Invalid ${name}: ${parsed}. Must be between ${min} and ${max}.`);
    }
    
    return parsed;
  }
}

/**
 * Interactive CLI prompts
 */
export class CLIPrompts {
  /**
   * Prompt for missing mode
   */
  static async promptForMode(): Promise<'questions' | 'answers' | 'all'> {
    console.log('\n📝 Select operation mode:');
    console.log('  1) questions  - Generate questions only');
    console.log('  2) answers    - Generate answers for existing questions');
    console.log('  3) all        - Generate both questions and answers');
    
    return new Promise((resolve) => {
      if (!process.stdin.isTTY) {
        console.log('⚠️ Non-interactive environment. Defaulting to "all".');
        resolve('all');
        return;
      }

      process.stdin.setRawMode(false);
      process.stdin.resume();
      process.stdout.write('\nEnter your choice (1-3): ');
      
      process.stdin.once('data', (data) => {
        const choice = data.toString().trim();
        switch (choice) {
          case '1': resolve('questions'); break;
          case '2': resolve('answers'); break;
          case '3': resolve('all'); break;
          default:
            console.log('❌ Invalid choice. Defaulting to "all".');
            resolve('all');
        }
        process.stdin.pause();
      });
    });
  }

  /**
   * Prompt for missing region
   */
  static async promptForRegion(): Promise<Region> {
    console.log('\n🏘️ Available regions:');
    regions.forEach((region, index) => {
      console.log(`  ${index + 1}) ${region.pinyin.padEnd(12)} - ${region.name} (${region.description})`);
    });
    
    return new Promise((resolve) => {
      process.stdout.write(`\nEnter region number (1-${regions.length}): `);
      process.stdin.once('data', (data) => {
        const choice = parseInt(data.toString().trim(), 10);
        if (choice >= 1 && choice <= regions.length) {
          resolve(regions[choice - 1]);
        } else {
          console.log(`❌ Invalid choice. Defaulting to "${regions[0].pinyin}".`);
          resolve(regions[0]);
        }
      });
    });
  }

  /**
   * Prompt for count
   */
  static async promptForCount(): Promise<number> {
    return new Promise((resolve) => {
      process.stdout.write('\n📊 Number of questions to generate (default: 1000): ');
      process.stdin.once('data', (data) => {
        const input = data.toString().trim();
        if (!input) {
          resolve(1000);
          return;
        }
        
        const count = parseInt(input, 10);
        if (isNaN(count) || count < 1 || count > 10000) {
          console.log('❌ Invalid count. Using default: 1000');
          resolve(1000);
        } else {
          resolve(count);
        }
      });
    });
  }
}

/**
 * CLI display utilities
 */
export class CLIDisplay {
  /**
   * Show help message
   */
  static showHelp(): void {
    const sections = [
      this.getHelpHeader(),
      this.getUsageSection(),
      this.getArgumentsSection(),
      this.getExamplesSection(),
      this.getEnvironmentSection()
    ];
    
    console.log(sections.join('\n'));
  }

  /**
   * Show available regions
   */
  static showRegions(): void {
    console.log('\n🏘️ Available Regions:\n');
    
    const maxPinyinLength = Math.max(...regions.map(r => r.pinyin.length));
    const maxNameLength = Math.max(...regions.map(r => r.name.length));
    
    regions.forEach(region => {
      const pinyin = region.pinyin.padEnd(maxPinyinLength);
      const name = region.name.padEnd(maxNameLength);
      console.log(`  ${pinyin}  ${name}  ${region.description}`);
    });
    
    console.log(`\nUsage: bun run start --region <pinyin_name>\n`);
  }

  /**
   * Show version information
   */
  static showVersion(): void {
    // Read version from package.json
    try {
      const packageJson = require('../package.json');
      console.log(`🤖 QA Generator v${packageJson.version}`);
      console.log(`Built with Bun and TypeScript\n`);
    } catch {
      console.log('🤖 QA Generator - Version information not available\n');
    }
  }

  /**
   * Get help header section
   */
  private static getHelpHeader(): string {
    return '\n🤖 QA Generator - AI-powered Question and Answer Generation Tool';
  }

  /**
   * Get usage section
   */
  private static getUsageSection(): string {
    return `\nUSAGE:
  bun run start [OPTIONS]
  bun run start --mode <type> --region <name> [OPTIONS]`;
  }

  /**
   * Get arguments section
   */
  private static getArgumentsSection(): string {
    return `\nREQUIRED ARGUMENTS:
  -m, --mode <type>           Operation mode (questions|answers|all)
  -r, --region <name>         Region name in pinyin (e.g., "chibi", "changzhou")

OPTIONAL ARGUMENTS:
  -c, --count <number>        Total questions to generate (default: 1000, max: 10000)
  -w, --workers <number>      Number of worker threads (default: 5, max: 50)
      --max-q-per-worker <n>  Maximum questions per worker (default: 50)
  -a, --attempts <number>     Maximum retry attempts (default: 3, max: 10)
  -b, --batch <number>        Batch size for processing (default: 50, max: 200)
  -d, --delay <number>        Delay between batches in ms (default: 1000)
  -p, --provider <name>       AI provider (qianfan|groq|openai, default: qianfan)

FLAGS:
  -h, --help                  Show this help message
  -l, --list                  List available regions
  -v, --version               Show version information
  -i, --interactive           Interactive mode for missing arguments`;
  }

  /**
   * Get examples section
   */
  private static getExamplesSection(): string {
    return `\nEXAMPLES:
  # Quick start with interactive mode
  bun run start --interactive

  # Generate 100 questions for Chibi region
  bun run start --mode questions --region chibi --count 100

  # Generate answers with 3 workers
  bun run start -m answers -r chibi -w 3

  # Full workflow with custom settings
  bun run start -m all -r changzhou -c 500 -w 10 -b 100 -d 2000

  # Use different AI providers
  bun run start -m questions -r chibi -p groq
  AI_PROVIDER=openai bun run start -m answers -r chibi`;
  }

  /**
   * Get environment variables section
   */
  private static getEnvironmentSection(): string {
    return `\nENVIRONMENT VARIABLES:
  AI_PROVIDER     Default AI provider (qianfan|groq|openai)
  
For provider-specific setup, check the README or provider documentation.
`;
  }

  /**
   * Show configuration summary
   */
  static showConfig(config: CLIConfig): void {
    console.log('📋 Configuration Summary:');
    console.log(`  Mode: ${config.mode}`);
    console.log(`  Region: ${config.region.name} (${config.region.pinyin})`);
    console.log(`  Provider: ${config.provider}`);
    
    if (config.mode === 'questions' || config.mode === 'all') {
      console.log(`  Questions to generate: ${config.count.toLocaleString()}`);
      console.log(`  Max questions per worker: ${config.maxQPerWorker}`);
    }
    
    console.log(`  Workers: ${config.workers}`);
    console.log(`  Batch size: ${config.batch}`);
    console.log(`  Delay between batches: ${config.delay}ms`);
    console.log(`  Max retry attempts: ${config.attempts}`);
    console.log('');
  }
}