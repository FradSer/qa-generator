#!/bin/bash

# AI微调数据集生成器 - 开发环境启动脚本
# 启动所有服务的Docker容器（开发模式，支持热重载）

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

print_message $BLUE "🚀 AI微调数据集生成器 - 开发环境启动"
print_message $BLUE "=========================================="

# 检查Docker和Docker Compose是否安装
check_dependencies() {
    print_message $YELLOW "📋 检查依赖项..."
    
    if ! command -v docker &> /dev/null; then
        print_message $RED "❌ Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_message $RED "❌ Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    print_message $GREEN "✅ 依赖项检查完成"
}

# 检查环境文件
check_env_file() {
    if [ ! -f ".env" ]; then
        print_message $YELLOW "⚠️  .env文件不存在，从.env.example创建..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
        else
            print_message $YELLOW "📝 创建基础.env文件..."
            cat > .env << 'EOF'
# 数据库配置
POSTGRES_PASSWORD=password123
REDIS_PASSWORD=redis123

# LLM API Keys (请替换为您的实际API密钥)
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key

# 应用配置
SECRET_KEY=dev-secret-key-change-in-production
EOF
        fi
        print_message $YELLOW "📝 请编辑.env文件并填入必要的配置"
        print_message $YELLOW "   特别是LLM API Keys (OPENAI_API_KEY, ANTHROPIC_API_KEY等)"
    fi
}

# 创建必要的目录
create_directories() {
    print_message $YELLOW "📁 创建必要的目录..."
    
    mkdir -p logs
    mkdir -p config
    mkdir -p scripts
    
    print_message $GREEN "✅ 目录创建完成"
}

# 停止可能运行的服务
stop_existing_services() {
    print_message $YELLOW "🛑 停止现有服务..."
    
    # 停止生产环境服务
    docker-compose down 2>/dev/null || true
    
    # 停止开发环境服务
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    print_message $GREEN "✅ 现有服务已停止"
}

# 启动开发环境服务
start_dev_services() {
    print_message $YELLOW "🔥 启动开发环境服务..."
    
    # 先尝试启动基础服务（数据库和缓存）
    print_message $BLUE "🐳 启动基础服务（数据库和缓存）..."
    if ! docker-compose -f docker-compose.dev.yml up -d postgres redis; then
        print_message $RED "❌ 基础服务启动失败"
        return 1
    fi
    
    print_message $BLUE "🐳 构建并启动应用服务..."
    # 尝试构建和启动应用服务，如果网络有问题则提供替代方案
    if ! timeout 180 docker-compose -f docker-compose.dev.yml up -d --build backend frontend; then
        print_message $YELLOW "⚠️  Docker Hub连接可能有问题，尝试仅启动基础服务..."
        print_message $YELLOW "您可以稍后在网络恢复后运行以下命令启动完整服务："
        print_message $BLUE "docker-compose -f docker-compose.dev.yml up -d --build"
        return 0
    fi
    
    print_message $GREEN "✅ 开发环境服务启动完成"
}

# 等待服务启动
wait_for_services() {
    print_message $YELLOW "⏳ 等待服务启动..."
    
    # 等待数据库
    print_message $BLUE "等待数据库启动..."
    max_db_attempts=30
    db_attempt=0
    while [ $db_attempt -lt $max_db_attempts ]; do
        if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            print_message $GREEN "✅ 数据库已就绪"
            break
        fi
        db_attempt=$((db_attempt + 1))
        sleep 2
    done
    
    if [ $db_attempt -eq $max_db_attempts ]; then
        print_message $RED "❌ 数据库启动超时"
        return 1
    fi
    
    # 等待Redis
    print_message $BLUE "等待Redis启动..."
    max_redis_attempts=30
    redis_attempt=0
    while [ $redis_attempt -lt $max_redis_attempts ]; do
        if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli -a redis123 ping > /dev/null 2>&1; then
            print_message $GREEN "✅ Redis已就绪"
            break
        fi
        redis_attempt=$((redis_attempt + 1))
        sleep 2
    done
    
    if [ $redis_attempt -eq $max_redis_attempts ]; then
        print_message $RED "❌ Redis启动超时"
        return 1
    fi
    
    # 检查是否有后端服务运行
    if docker-compose -f docker-compose.dev.yml ps backend | grep -q "Up"; then
        print_message $BLUE "等待后端API启动..."
        max_api_attempts=60
        api_attempt=0
        while [ $api_attempt -lt $max_api_attempts ]; do
            if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
                print_message $GREEN "✅ 后端API已就绪"
                break
            fi
            api_attempt=$((api_attempt + 1))
            sleep 2
        done
        
        if [ $api_attempt -eq $max_api_attempts ]; then
            print_message $YELLOW "⚠️  后端API可能还在启动中"
        fi
    else
        print_message $YELLOW "⚠️  后端服务未运行，请检查Docker Hub连接"
    fi
    
    print_message $GREEN "✅ 基础服务已就绪"
}

# 显示服务状态
show_status() {
    print_message $YELLOW "📊 服务状态..."
    docker-compose -f docker-compose.dev.yml ps
    
    print_message $BLUE "\n🌐 开发环境访问地址:"
    print_message $GREEN "前端界面 (热重载): http://localhost:3000"
    print_message $GREEN "后端API (热重载): http://localhost:8000"
    print_message $GREEN "API文档: http://localhost:8000/docs"
    print_message $GREEN "数据库: localhost:5432"
    print_message $GREEN "Redis: localhost:6379"
    
    print_message $BLUE "\n📝 开发提示:"
    print_message $YELLOW "• 前端代码修改会自动热重载"
    print_message $YELLOW "• 后端代码修改会自动重启服务"
    print_message $YELLOW "• 查看日志: docker-compose -f docker-compose.dev.yml logs -f"
    print_message $YELLOW "• 停止服务: ./stop-dev.sh 或 docker-compose -f docker-compose.dev.yml down"
}

# 主函数
main() {
    check_dependencies
    check_env_file
    create_directories
    stop_existing_services
    start_dev_services
    wait_for_services
    show_status
    
    print_message $GREEN "\n🎉 开发环境启动完成！"
    print_message $BLUE "开始您的开发之旅吧！"
}

# 脚本入口
main "$@"