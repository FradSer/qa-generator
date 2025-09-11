#!/bin/bash

# AI微调数据集生成器 - 停止开发环境脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message $BLUE "🛑 停止开发环境服务"
print_message $BLUE "====================="

# 停止开发环境服务
print_message $YELLOW "停止开发环境容器..."
docker-compose -f docker-compose.dev.yml down

print_message $GREEN "✅ 开发环境已停止"

# 可选：清理
if [[ $1 == "clean" || $1 == "-c" ]]; then
    print_message $YELLOW "🧹 清理开发环境数据..."
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    print_message $GREEN "✅ 开发环境数据已清理"
fi

print_message $BLUE "\n重新启动使用: ./start-dev.sh"