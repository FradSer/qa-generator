#!/bin/bash

# AI微调数据集生成器 - 开发环境基础启动脚本（仅启动数据库服务）
# 用于网络连接有问题时的替代方案

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

print_message $BLUE "🗄️ AI微调数据集生成器 - 基础服务启动"
print_message $BLUE "=========================================="

# 检查Docker是否可用
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    print_message $RED "❌ Docker或Docker Compose未安装"
    exit 1
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    print_message $YELLOW "📝 创建基础.env文件..."
    cp .env.development .env || {
        print_message $RED "❌ 无法创建.env文件"
        exit 1
    }
fi

# 停止现有服务
print_message $YELLOW "🛑 停止现有服务..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# 启动基础服务（PostgreSQL和Redis）
print_message $YELLOW "🚀 启动基础服务（PostgreSQL和Redis）..."
if ! docker-compose -f docker-compose.dev.yml up -d postgres redis; then
    print_message $RED "❌ 基础服务启动失败"
    exit 1
fi

# 等待服务就绪
print_message $YELLOW "⏳ 等待服务就绪..."

# 等待PostgreSQL
print_message $BLUE "等待PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_message $GREEN "✅ PostgreSQL已就绪"
        break
    fi
    sleep 2
done

# 等待Redis
print_message $BLUE "等待Redis..."
for i in {1..30}; do
    if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli -a redis123 ping >/dev/null 2>&1; then
        print_message $GREEN "✅ Redis已就绪"
        break
    fi
    sleep 2
done

print_message $YELLOW "📊 服务状态:"
docker-compose -f docker-compose.dev.yml ps

print_message $GREEN "\n🎉 基础服务启动完成！"
print_message $BLUE "\n🌐 可用服务:"
print_message $GREEN "PostgreSQL: localhost:5432 (用户: postgres, 密码: password123)"
print_message $GREEN "Redis: localhost:6379 (密码: redis123)"

print_message $BLUE "\n📝 下一步:"
print_message $YELLOW "1. 网络恢复后，运行完整启动: ./start-dev.sh"
print_message $YELLOW "2. 或手动启动应用服务: docker-compose -f docker-compose.dev.yml up -d --build backend frontend"
print_message $YELLOW "3. 或在本地启动应用进行开发（连接到Docker的数据库）"