# QA Generator - Architecture Documentation

## Overview

The QA Generator has been transformed from a monolithic 797-line application into a secure, maintainable, service-oriented architecture. This document outlines the new architecture, design decisions, and usage patterns.

## Architecture Diagram

```
┌─────────────────┐
│   Application   │  app.ts (300 lines)
│    QAGeneratorApp│  - CLI parsing & validation
│                 │  - Workflow orchestration
│                 │  - Error handling & logging
└─────────┬───────┘
          │
┌─────────▼───────┐
│  Service Layer  │  
│                 │  
│ ┌─────────────┐ │  StorageService (198 lines)
│ │   Storage   │ │  - Secure file operations
│ │   Service   │ │  - Data validation
│ │             │ │  - Progress tracking
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │  QuestionGenerationService (434 lines)
│ │  Question   │ │  - AI question generation
│ │ Generation  │ │  - Parallel processing
│ │  Service    │ │  - Uniqueness filtering
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │  AnswerGenerationService (389 lines)
│ │   Answer    │ │  - AI answer generation
│ │ Generation  │ │  - Batch processing
│ │   Service   │ │  - Progress tracking
│ └─────────────┘ │
└─────────┬───────┘
          │
┌─────────▼───────┐
│ Infrastructure  │
│                 │
│ ┌─────────────┐ │  ProviderFactory
│ │  Provider   │ │  - AI provider management
│ │   Factory   │ │  - Singleton pattern
│ │             │ │  - Dynamic loading
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │  SecureLogger (283 lines)
│ │   Secure    │ │  - Data sanitization
│ │   Logger    │ │  - Security events
│ │             │ │  - Performance metrics
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │  InputValidator
│ │    Input    │ │  - Injection prevention
│ │  Validator  │ │  - Type validation
│ │             │ │  - Path security
│ └─────────────┘ │
└─────────────────┘
```

## Core Design Principles

### 1. **Security First**
- **Input Validation**: All user inputs validated at boundaries
- **Path Security**: Directory traversal prevention
- **Data Protection**: Automatic sensitive data redaction
- **Injection Prevention**: Command and code injection blocked

### 2. **Single Responsibility**
- **StorageService**: Only handles file operations
- **QuestionGenerationService**: Only handles question generation
- **AnswerGenerationService**: Only handles answer generation
- **Each service has one clear purpose**

### 3. **Dependency Injection**
- **Constructor injection** for all dependencies
- **Interfaces** define contracts between services
- **Factory pattern** for provider management
- **Fully testable** architecture

### 4. **Error Handling**
- **Result Pattern**: Consistent error handling
- **Graceful Degradation**: Failures don't crash the system
- **Secure Logging**: Errors logged without sensitive data
- **User-Friendly Messages**: Clear error communication

## Service Details

### Application Layer

#### QAGeneratorApp
**Responsibilities:**
- Command-line argument parsing and validation
- Workflow orchestration (questions → answers → completion)
- Global error handling and graceful shutdown
- Performance monitoring and metrics

**Key Features:**
- Secure configuration parsing with input validation
- Provider setup with environment-based selection
- Structured logging with security awareness
- Signal handling for graceful shutdown

### Service Layer

#### StorageService
**Responsibilities:**
- Secure file operations with path validation
- JSON data serialization/deserialization
- Data structure validation and cleaning
- Progress tracking and statistics

**Security Features:**
- Path traversal prevention
- Input validation for all operations
- Atomic file operations
- Data integrity checking

#### QuestionGenerationService
**Responsibilities:**
- AI-powered question generation
- Parallel processing with worker pools
- Uniqueness and similarity filtering
- Batch processing with retry logic

**Processing Modes:**
- **Sequential**: Simple mode for testing/debugging
- **Parallel**: Production mode with worker pools
- **Retry Logic**: Automatic failure recovery
- **Progress Tracking**: Real-time status updates

#### AnswerGenerationService
**Responsibilities:**
- AI-powered answer generation
- Batch processing optimization
- Question status tracking
- Progress persistence

**Optimization Features:**
- Intelligent batch sizing
- Worker pool management
- Progress checkpointing
- Error recovery

### Infrastructure Layer

#### ProviderFactory
**Responsibilities:**
- AI provider instantiation and management
- Environment-based provider selection
- Singleton pattern for resource efficiency
- Dynamic loading of provider modules

**Supported Providers:**
- **QianFan**: Baidu's AI service
- **Groq**: High-performance inference
- **OpenAI**: GPT models
- **Extensible**: Easy to add new providers

#### SecureLogger
**Responsibilities:**
- Security-aware logging with data protection
- Automatic sensitive data redaction
- Performance metrics collection
- Security event tracking

**Security Features:**
- API key/token automatic redaction
- Credit card number masking
- Email address privacy protection
- Log length limits (prevent log bombing)

#### InputValidator
**Responsibilities:**
- Comprehensive input validation
- Injection attack prevention
- Path security validation
- Type safety enforcement

**Validation Types:**
- String validation with character restrictions
- Numeric validation with bounds checking
- File path validation with traversal prevention
- Command argument sanitization

## Usage Patterns

### Basic Usage
```bash
# Interactive mode (recommended for new users)
bun run start --interactive

# Generate questions for a region
bun run start --mode questions --region chibi --count 100
# Short form
bun run start -m questions -r chibi -c 100

# Generate answers for existing questions
bun run start -m answers -r chibi -w 3

# Full workflow: questions + answers
bun run start -m all -r chibi -c 500 -w 10
```

### Advanced Configuration
```bash
# High-volume processing
bun run start --mode all \
  --region changzhou \
  --count 2000 \
  --workers 15 \
  --max-q-per-worker 100 \
  --batch 100 \
  --delay 500

# Conservative processing (rate limiting)
bun run start --mode answers \
  --region chibi \
  --workers 2 \
  --delay 3000 \
  --attempts 5
```

### Environment Configuration
```bash
# Use different AI providers
AI_PROVIDER=groq bun run start --mode questions --region chibi
AI_PROVIDER=openai bun run start --mode answers --region chibi
AI_PROVIDER=qianfan bun run start --mode all --region chibi  # default
```

## Security Model

### Input Validation Layers
1. **Command Line**: Arguments validated before processing
2. **Service Boundary**: All service inputs validated
3. **Storage Layer**: File paths and data validated
4. **Provider Interface**: AI provider inputs sanitized

### Data Protection
- **Automatic Redaction**: API keys, tokens, passwords
- **Privacy Protection**: Email masking, IP address anonymization
- **Log Security**: Sensitive patterns detected and removed
- **File Security**: Safe path construction prevents traversal

### Error Handling Security
- **No Information Disclosure**: Stack traces only in development
- **Safe Error Messages**: User-friendly without system details
- **Audit Logging**: Security events tracked for monitoring
- **Graceful Degradation**: Failures handled without crashes

## Performance Characteristics

### Scalability
- **Parallel Processing**: Worker pools for concurrent operations
- **Batch Processing**: Optimized batch sizes for throughput
- **Memory Management**: Proper resource cleanup
- **Progress Persistence**: Resume capability after interruption

### Monitoring
- **Performance Metrics**: Duration, memory usage, throughput
- **Progress Tracking**: Real-time status updates
- **Error Tracking**: Failure rates and recovery metrics
- **Security Events**: Validation failures and suspicious activity

## Testing Strategy

### Unit Testing
- **Service Isolation**: Each service testable independently
- **Dependency Injection**: Mock dependencies for testing
- **Result Pattern**: Predictable error handling testing
- **Input Validation**: Comprehensive boundary testing

### Integration Testing
- **End-to-End Workflows**: Full question/answer generation cycles
- **Provider Integration**: AI service integration testing
- **File Operations**: Storage service integration testing
- **Error Scenarios**: Failure recovery testing

## Migration Guide

### From Legacy Version
1. **Backup Current Data**: Ensure all `.json` files are backed up
2. **Test New Version**: Use `bun run start` with small datasets
3. **Compare Results**: Validate output matches legacy version
4. **Full Migration**: Switch to new version for production

### Legacy Support
- **Preserved**: Original code saved as `index.legacy.ts`
- **Command**: Use `bun run start:legacy` for old version
- **Compatibility**: All existing data files work with new version

## Development Guidelines

### Adding New Features
1. **Service Layer**: Extend existing services or create new ones
2. **Input Validation**: Add validation for new parameters
3. **Error Handling**: Use Result pattern for error handling
4. **Logging**: Use SecureLogger for all logging needs
5. **Testing**: Add unit tests for new functionality

### Code Quality Standards
- **Functions**: Keep under 20 lines
- **Single Responsibility**: One purpose per function/class
- **Type Safety**: Use strict TypeScript types
- **Error Handling**: Always use Result pattern
- **Documentation**: Document public interfaces

## Troubleshooting

### Common Issues
1. **Permission Errors**: Check file system permissions
2. **API Limits**: Reduce worker count or add delays
3. **Memory Issues**: Reduce batch sizes
4. **Network Errors**: Check internet connectivity and API keys

### Debug Mode
```bash
# Enable detailed logging
DEBUG=1 bun run start --mode all --region chibi

# Use legacy version for comparison
bun run start:legacy --mode all --region chibi
```

### Log Analysis
- **Security Events**: Look for `SECURITY_EVENT` entries
- **Performance**: Check `PERFORMANCE` metrics
- **Errors**: Review error messages for patterns
- **Validation**: Check for validation failures

## Future Enhancements

### Planned Features
- **Database Storage**: Replace JSON files with database
- **Web Interface**: Add web-based management interface
- **API Endpoints**: RESTful API for external integration
- **Advanced Metrics**: Detailed analytics and reporting

### Extensibility Points
- **New AI Providers**: Extend ProviderFactory
- **Custom Storage**: Implement storage interface
- **Processing Modes**: Add new generation strategies
- **Validation Rules**: Extend InputValidator

## Conclusion

The new architecture provides a secure, maintainable, and scalable foundation for the QA Generator. The transformation from a monolithic application to a service-oriented architecture significantly improves code quality, security posture, and development productivity while maintaining full backward compatibility.