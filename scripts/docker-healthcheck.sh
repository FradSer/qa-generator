#!/bin/sh

# Docker health check script for QA Generator

set -e

# Configuration
PORT=${PORT:-3000}
HEALTH_ENDPOINT="http://localhost:${PORT}/api/health"
TIMEOUT=10

# Function to log messages
log_info() {
    echo "[HEALTH] $1"
}

log_error() {
    echo "[HEALTH ERROR] $1" >&2
}

# Main health check
check_health() {
    # Check if the health endpoint responds
    if curl -f -s --max-time "$TIMEOUT" "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        log_info "Health check passed - service is healthy"
        return 0
    else
        log_error "Health check failed - service is unhealthy"
        return 1
    fi
}

# Detailed health check with output
check_health_verbose() {
    local response
    response=$(curl -f -s --max-time "$TIMEOUT" "$HEALTH_ENDPOINT?format=text" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_info "Health check passed:"
        echo "$response"
        return 0
    else
        log_error "Health check failed with exit code $exit_code"
        echo "$response" >&2
        return 1
    fi
}

# Run health check
if [ "$1" = "--verbose" ]; then
    check_health_verbose
else
    check_health
fi