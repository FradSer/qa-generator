#!/bin/bash

# QA Generator Production Startup Script
# This script handles production deployment and startup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="QA Generator"
APP_DIR="/Users/FradSer/Developer/FradSer/qa-generator"
LOG_DIR="$APP_DIR/logs"
DATA_DIR="$APP_DIR/data"
BACKUP_DIR="$APP_DIR/backups"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).some((v,i) => v > '$REQUIRED_VERSION'.split('.')[i] || (v === Number('$REQUIRED_VERSION'.split('.')[i]) && i === 2)) ? 0 : 1)"; then
        log_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
        exit 1
    fi
    
    # Check for package manager
    if command -v bun &> /dev/null; then
        PACKAGE_MANAGER="bun"
    elif command -v yarn &> /dev/null; then
        PACKAGE_MANAGER="yarn"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
    else
        log_error "No package manager found (bun, yarn, or npm required)"
        exit 1
    fi
    
    log_success "Using package manager: $PACKAGE_MANAGER"
    log_success "Node.js version: $NODE_VERSION"
}

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Set proper permissions
    chmod 755 "$LOG_DIR" "$DATA_DIR" "$BACKUP_DIR"
    
    log_success "Directories created and configured"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        if [ -f "$APP_DIR/.env.production" ]; then
            log_warning ".env file not found. Creating from .env.production template"
            cp "$APP_DIR/.env.production" "$APP_DIR/.env"
            log_warning "Please configure .env file with your actual values"
            log_warning "Run: node scripts/generate-api-key.js --save to generate API key"
            return 1
        else
            log_error ".env file not found and no template available"
            exit 1
        fi
    fi
    
    # Check required environment variables
    source "$APP_DIR/.env"
    
    if [ -z "$NODE_ENV" ]; then
        log_error "NODE_ENV not set in .env file"
        exit 1
    fi
    
    if [ "$NODE_ENV" = "production" ] && [ -z "$QA_GENERATOR_API_KEY" ]; then
        log_error "QA_GENERATOR_API_KEY not set for production"
        log_info "Run: node scripts/generate-api-key.js --save"
        exit 1
    fi
    
    # Check AI provider configuration
    AI_PROVIDER=${AI_PROVIDER:-"qianfan"}
    case $AI_PROVIDER in
        "qianfan")
            if [ -z "$QIANFAN_ACCESS_KEY" ] || [ -z "$QIANFAN_SECRET_KEY" ]; then
                log_warning "QianFan API keys not configured"
            fi
            ;;
        "groq")
            if [ -z "$GROQ_API_KEY" ]; then
                log_warning "Groq API key not configured"
            fi
            ;;
        "openai")
            if [ -z "$OPENAI_API_KEY" ]; then
                log_warning "OpenAI API key not configured"
            fi
            ;;
    esac
    
    log_success "Environment configuration validated"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$APP_DIR"
    
    case $PACKAGE_MANAGER in
        "bun")
            bun install --production
            ;;
        "yarn")
            yarn install --production
            ;;
        "npm")
            npm ci --production
            ;;
    esac
    
    log_success "Dependencies installed"
}

build_application() {
    log_info "Building application..."
    
    cd "$APP_DIR"
    
    # Type checking
    if command -v tsc &> /dev/null || [ -f "node_modules/.bin/tsc" ]; then
        log_info "Running type check..."
        if [ -f "node_modules/.bin/tsc" ]; then
            ./node_modules/.bin/tsc --noEmit
        else
            tsc --noEmit
        fi
        log_success "Type check passed"
    fi
    
    # Build Next.js application
    case $PACKAGE_MANAGER in
        "bun")
            bun run build
            ;;
        "yarn")
            yarn build
            ;;
        "npm")
            npm run build
            ;;
    esac
    
    log_success "Application built successfully"
}

health_check() {
    log_info "Performing pre-startup health check..."
    
    # Check if health endpoint responds
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:${PORT:-3000}/api/health"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$health_url" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

backup_data() {
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR)" ]; then
        log_info "Creating data backup..."
        
        BACKUP_FILE="$BACKUP_DIR/data_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$BACKUP_FILE" -C "$DATA_DIR" .
        
        # Keep only last 7 backups
        find "$BACKUP_DIR" -name "data_backup_*.tar.gz" -type f -mtime +7 -delete
        
        log_success "Data backup created: $BACKUP_FILE"
    fi
}

start_server() {
    log_info "Starting $APP_NAME server..."
    
    cd "$APP_DIR"
    
    # Create log files
    touch "$LOG_DIR/access.log"
    touch "$LOG_DIR/error.log"
    touch "$LOG_DIR/app.log"
    
    # Start the server
    case $PACKAGE_MANAGER in
        "bun")
            export NODE_ENV=${NODE_ENV:-production}
            bun run start:next > "$LOG_DIR/app.log" 2>&1 &
            ;;
        "yarn")
            export NODE_ENV=${NODE_ENV:-production}
            yarn start > "$LOG_DIR/app.log" 2>&1 &
            ;;
        "npm")
            export NODE_ENV=${NODE_ENV:-production}
            npm run start > "$LOG_DIR/app.log" 2>&1 &
            ;;
    esac
    
    SERVER_PID=$!
    echo $SERVER_PID > "$APP_DIR/server.pid"
    
    log_info "Server started with PID: $SERVER_PID"
    log_info "Waiting for server to be ready..."
    
    # Wait a moment for server to start
    sleep 5
    
    # Verify server is running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        log_error "Server failed to start"
        cat "$LOG_DIR/app.log" | tail -20
        exit 1
    fi
    
    log_success "$APP_NAME server started successfully!"
    log_info "Server URL: http://localhost:${PORT:-3000}"
    log_info "Health Check: http://localhost:${PORT:-3000}/api/health"
    log_info "Logs: $LOG_DIR/app.log"
    log_info "PID: $SERVER_PID (saved to server.pid)"
}

stop_server() {
    log_info "Stopping server..."
    
    if [ -f "$APP_DIR/server.pid" ]; then
        PID=$(cat "$APP_DIR/server.pid")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID
            fi
            rm -f "$APP_DIR/server.pid"
            log_success "Server stopped"
        else
            log_warning "Server was not running"
            rm -f "$APP_DIR/server.pid"
        fi
    else
        log_warning "No PID file found"
    fi
}

show_status() {
    log_info "Server status:"
    
    if [ -f "$APP_DIR/server.pid" ]; then
        PID=$(cat "$APP_DIR/server.pid")
        if kill -0 $PID 2>/dev/null; then
            log_success "Server is running (PID: $PID)"
            
            # Show health status if available
            local health_url="http://localhost:${PORT:-3000}/api/health"
            if command -v curl &> /dev/null; then
                local health_status=$(curl -s "$health_url?format=text" 2>/dev/null | head -1)
                if [ -n "$health_status" ]; then
                    log_info "Health Status: $health_status"
                fi
            fi
        else
            log_error "Server PID file exists but process is not running"
            rm -f "$APP_DIR/server.pid"
        fi
    else
        log_info "Server is not running"
    fi
}

show_usage() {
    echo "Usage: $0 {start|stop|restart|status|build|health}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the production server"
    echo "  stop     - Stop the running server"
    echo "  restart  - Restart the server"
    echo "  status   - Show server status"
    echo "  build    - Build the application"
    echo "  health   - Perform health check"
    echo ""
    echo "Environment Variables:"
    echo "  PORT     - Server port (default: 3000)"
    echo "  NODE_ENV - Environment (default: production)"
}

# Main script logic
case "${1:-start}" in
    "start")
        log_info "Starting $APP_NAME in production mode..."
        check_requirements
        setup_directories
        if ! check_environment; then
            exit 1
        fi
        backup_data
        install_dependencies
        build_application
        start_server
        ;;
    
    "stop")
        stop_server
        ;;
    
    "restart")
        stop_server
        sleep 2
        log_info "Restarting $APP_NAME..."
        check_requirements
        if ! check_environment; then
            exit 1
        fi
        install_dependencies
        build_application
        start_server
        ;;
    
    "status")
        show_status
        ;;
    
    "build")
        check_requirements
        install_dependencies
        build_application
        ;;
    
    "health")
        if command -v curl &> /dev/null; then
            curl -s "http://localhost:${PORT:-3000}/api/health?format=text" || log_error "Health check failed"
        else
            log_error "curl not available for health check"
        fi
        ;;
    
    *)
        show_usage
        exit 1
        ;;
esac