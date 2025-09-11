#!/bin/bash

# AI微调数据集生成器 - 生产环境启动脚本
# 启动所有服务的Docker容器（生产模式，优化构建）

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

print_message $BLUE "🏭 AI微调数据集生成器 - 生产环境启动"
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
        print_message $RED "❌ .env文件不存在"
        print_message $YELLOW "请创建.env文件并配置必要的环境变量"
        print_message $YELLOW "参考.env.example文件"
        exit 1
    fi
    
    # 检查关键环境变量
    if ! grep -q "POSTGRES_PASSWORD=" .env; then
        print_message $RED "❌ 缺少POSTGRES_PASSWORD配置"
        exit 1
    fi
    
    print_message $GREEN "✅ 环境配置检查完成"
}

# 创建必要的目录
create_directories() {
    print_message $YELLOW "📁 创建必要的目录..."
    
    mkdir -p logs
    mkdir -p config
    mkdir -p scripts
    mkdir -p nginx
    
    print_message $GREEN "✅ 目录创建完成"
}

# 停止可能运行的服务
stop_existing_services() {
    print_message $YELLOW "🛑 停止现有服务..."
    
    # 停止开发环境服务
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # 停止生产环境服务
    docker-compose down 2>/dev/null || true
    
    print_message $GREEN "✅ 现有服务已停止"
}

# 启动生产环境服务
start_prod_services() {
    print_message $YELLOW "🔥 启动生产环境服务..."
    
    print_message $BLUE "🐳 构建并启动所有服务（生产模式）..."
    docker-compose up -d --build
    
    print_message $GREEN "✅ 生产环境服务启动完成"
}

# 健康检查
health_check() {
    print_message $YELLOW "🏥 执行健康检查..."
    
    max_attempts=60
    attempt=0
    
    # 检查后端服务
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
            print_message $GREEN "✅ 后端服务健康"
            break
        fi
        
        attempt=$((attempt + 1))
        print_message $YELLOW "⏳ 等待后端服务启动... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_message $RED "❌ 后端服务启动超时"
        docker-compose logs backend
        return 1
    fi
    
    # 检查前端服务
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            print_message $GREEN "✅ 前端服务健康"
            break
        fi
        
        attempt=$((attempt + 1))
        print_message $YELLOW "⏳ 等待前端服务启动... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_message $YELLOW "⚠️  前端服务可能还在启动中"
    fi
}

# 显示服务状态
show_status() {
    print_message $YELLOW "📊 服务状态..."
    docker-compose ps
    
    print_message $BLUE "\n🌐 生产环境访问地址:"
    print_message $GREEN "前端界面: http://localhost:3000"
    print_message $GREEN "后端API: http://localhost:8000"
    print_message $GREEN "API文档: http://localhost:8000/docs"
    
    if docker-compose ps | grep -q nginx; then
        print_message $GREEN "Nginx代理: http://localhost"
    fi
    
    if docker-compose ps | grep -q grafana; then
        print_message $GREEN "监控面板: http://localhost:3001 (admin/admin123)"
    fi
    
    print_message $BLUE "\n📝 管理命令:"
    print_message $YELLOW "• 查看日志: docker-compose logs -f"
    print_message $YELLOW "• 重启服务: docker-compose restart"
    print_message $YELLOW "• 停止服务: docker-compose down"
    print_message $YELLOW "• 更新服务: docker-compose up -d --build"
}

# 主函数
main() {
    local mode=${1:-"standard"}
    
    case $mode in
        "monitoring"|"monitor")
            print_message $BLUE "📈 启动监控模式"
            COMPOSE_PROFILES="monitoring" docker-compose up -d --build
            ;;
        "production"|"prod")
            print_message $BLUE "🏭 启动完整生产模式"
            COMPOSE_PROFILES="production" docker-compose up -d --build
            ;;
        *)
            print_message $BLUE "🌟 启动标准生产模式"
            check_dependencies
            check_env_file
            create_directories
            stop_existing_services
            start_prod_services
            health_check
            show_status
            ;;
    esac
    
    print_message $GREEN "\n🎉 生产环境启动完成！"
}

# 显示使用说明
if [[ $1 == "help" || $1 == "-h" || $1 == "--help" ]]; then
    cat << EOF
AI微调数据集生成器 - 生产环境启动脚本

用法: $0 [模式]

可用模式:
  standard    标准生产模式 (默认)
  monitor     包含监控的生产模式
  prod        完整生产模式 (包含Nginx)
  help        显示此帮助信息

示例:
  $0                # 标准生产启动
  $0 monitor       # 包含监控
  $0 prod          # 完整生产模式
EOF
    exit 0
fi

# 脚本入口
main "$@"