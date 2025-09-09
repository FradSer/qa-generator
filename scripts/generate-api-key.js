#!/usr/bin/env node

/**
 * API Key Generation Utility for QA Generator
 * 
 * This script generates secure API keys for production use.
 * 
 * Usage:
 *   node scripts/generate-api-key.js
 *   node scripts/generate-api-key.js --length 64
 *   node scripts/generate-api-key.js --format base64
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class APIKeyGenerator {
  constructor() {
    this.args = this.parseArguments();
  }

  parseArguments() {
    const args = {
      length: 32,
      format: 'hex', // hex, base64, base64url
      save: false,
      help: false
    };

    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      switch (arg) {
        case '--length':
        case '-l':
          args.length = parseInt(process.argv[++i]) || 32;
          break;
        case '--format':
        case '-f':
          args.format = process.argv[++i] || 'hex';
          break;
        case '--save':
        case '-s':
          args.save = true;
          break;
        case '--help':
        case '-h':
          args.help = true;
          break;
      }
    }

    return args;
  }

  showHelp() {
    console.log(`
🔐 QA Generator API Key Generator

Usage: node scripts/generate-api-key.js [options]

Options:
  -l, --length <number>    Key length in bytes (default: 32)
  -f, --format <format>    Output format: hex, base64, base64url (default: hex)
  -s, --save              Save key to .env file
  -h, --help              Show this help message

Examples:
  node scripts/generate-api-key.js
  node scripts/generate-api-key.js --length 64 --format base64
  node scripts/generate-api-key.js --save

Security Notes:
  • Store API keys securely and never commit them to version control
  • Use minimum 32-byte length for production
  • Rotate keys regularly
    `);
  }

  validateFormat(format) {
    const validFormats = ['hex', 'base64', 'base64url'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid format: ${format}. Valid formats: ${validFormats.join(', ')}`);
    }
  }

  generateKey() {
    this.validateFormat(this.args.format);
    
    const bytes = crypto.randomBytes(this.args.length);
    
    switch (this.args.format) {
      case 'hex':
        return bytes.toString('hex');
      case 'base64':
        return bytes.toString('base64');
      case 'base64url':
        return bytes.toString('base64url');
      default:
        throw new Error(`Unsupported format: ${this.args.format}`);
    }
  }

  saveToEnvFile(apiKey) {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.production');
    
    try {
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update existing QA_GENERATOR_API_KEY or add it
        if (envContent.includes('QA_GENERATOR_API_KEY=')) {
          envContent = envContent.replace(
            /QA_GENERATOR_API_KEY=.*/,
            `QA_GENERATOR_API_KEY=${apiKey}`
          );
        } else {
          envContent += `\nQA_GENERATOR_API_KEY=${apiKey}\n`;
        }
      } else {
        // Create new .env from template
        if (fs.existsSync(envExamplePath)) {
          envContent = fs.readFileSync(envExamplePath, 'utf8');
          envContent = envContent.replace(
            /QA_GENERATOR_API_KEY=.*/,
            `QA_GENERATOR_API_KEY=${apiKey}`
          );
        } else {
          envContent = `QA_GENERATOR_API_KEY=${apiKey}\n`;
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ API key saved to .env file`);
      
    } catch (error) {
      console.error(`❌ Error saving to .env file: ${error.message}`);
      process.exit(1);
    }
  }

  displayKeyInfo(apiKey) {
    console.log(`
🔐 Generated API Key:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${apiKey}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Details:
• Length: ${this.args.length} bytes
• Format: ${this.args.format}
• Entropy: ${this.args.length * 8} bits
• Strength: ${this.getStrengthLevel()}

Security Reminders:
• Store this key securely
• Never commit to version control  
• Use HTTPS in production
• Rotate regularly
    `);
  }

  getStrengthLevel() {
    const bits = this.args.length * 8;
    if (bits >= 256) return '🟢 Excellent';
    if (bits >= 128) return '🟡 Good';
    if (bits >= 64) return '🟠 Fair';
    return '🔴 Weak';
  }

  run() {
    try {
      if (this.args.help) {
        this.showHelp();
        return;
      }

      console.log('🚀 Generating secure API key for QA Generator...');
      
      const apiKey = this.generateKey();
      
      this.displayKeyInfo(apiKey);
      
      if (this.args.save) {
        this.saveToEnvFile(apiKey);
      } else {
        console.log('\nTo save this key to .env file, run with --save flag');
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the generator
if (require.main === module) {
  const generator = new APIKeyGenerator();
  generator.run();
}

module.exports = APIKeyGenerator;