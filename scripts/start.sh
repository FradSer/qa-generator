#!/bin/bash

# AI微调数据集生成器启动脚本
# 用于一键启动整个系统

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

print_message $BLUE "🚀 AI微调数据集生成器启动脚本"
print_message $BLUE "======================================"

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
        cp .env.example .env
        print_message $YELLOW "📝 请编辑.env文件并填入必要的配置"
        print_message $YELLOW "   特别是LLM API Keys (OPENAI_API_KEY, ANTHROPIC_API_KEY等)"
        read -p "是否现在编辑.env文件？(y/N): " edit_env
        if [[ $edit_env =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    fi
}

# 创建必要的目录
create_directories() {
    print_message $YELLOW "📁 创建必要的目录..."
    
    mkdir -p logs
    mkdir -p config
    mkdir -p scripts
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    mkdir -p nginx
    
    print_message $GREEN "✅ 目录创建完成"
}

# 创建配置文件
create_config_files() {
    print_message $YELLOW "⚙️  创建配置文件..."
    
    # 创建知识蒸馏配置
    if [ ! -f "config/distillation.json" ]; then
        cat > config/distillation.json << 'EOF'
{
  "teacher_models": [
    {
      "name": "gpt4_teacher",
      "provider_type": "openai",
      "config": {
        "api_key": "${OPENAI_API_KEY}",
        "base_url": "https://api.openai.com/v1",
        "model_name": "gpt-4o",
        "max_tokens": 2000,
        "rate_limit_per_minute": 30
      }
    }
  ],
  "student_models": [
    {
      "name": "gpt35_student",
      "provider_type": "openai",
      "config": {
        "api_key": "${OPENAI_API_KEY}",
        "base_url": "https://api.openai.com/v1",
        "model_name": "gpt-3.5-turbo",
        "max_tokens": 1000,
        "rate_limit_per_minute": 60
      }
    }
  ],
  "strategy": "response_based",
  "quality_threshold": 0.8,
  "cost_optimization": true,
  "adaptive_learning": true,
  "cache_patterns": true
}
EOF
    fi
    
    # 创建数据库初始化脚本
    if [ ! -f "scripts/init-db.sql" ]; then
        cat > scripts/init-db.sql << 'EOF'
-- 初始化数据库
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_generation_records_created_at ON generation_records(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_records_status ON generation_records(status);
CREATE INDEX IF NOT EXISTS idx_dataset_items_generation_id ON dataset_items(generation_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_generation_id ON cost_records(generation_id);
EOF
    fi
    
    print_message $GREEN "✅ 配置文件创建完成"
}

# 启动服务
start_services() {
    local profile=${1:-""}
    
    print_message $YELLOW "🔥 启动服务..."
    
    if [ "$profile" == "dev" ]; then
        print_message $BLUE "开发模式启动"
        docker-compose -f docker-compose.yml up -d postgres redis
        print_message $GREEN "✅ 基础服务已启动，可以本地运行后端和前端"
        print_message $YELLOW "后端启动: cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
        print_message $YELLOW "前端启动: cd frontend && npm run dev"
    elif [ "$profile" == "monitoring" ]; then
        print_message $BLUE "包含监控的完整启动"
        docker-compose --profile monitoring up -d
    elif [ "$profile" == "production" ]; then
        print_message $BLUE "生产环境启动"
        docker-compose --profile production up -d
    else
        print_message $BLUE "标准启动"
        docker-compose up -d
    fi
}

# 显示服务状态
show_status() {
    print_message $YELLOW "📊 服务状态..."
    docker-compose ps
    
    print_message $BLUE "\n🌐 服务访问地址:"
    print_message $GREEN "前端界面: http://localhost:3000"
    print_message $GREEN "后端API: http://localhost:8000"
    print_message $GREEN "API文档: http://localhost:8000/api/docs"
    
    if docker-compose ps | grep -q grafana; then
        print_message $GREEN "监控面板: http://localhost:3001 (admin/admin123)"
    fi
    
    if docker-compose ps | grep -q flower; then
        print_message $GREEN "任务监控: http://localhost:5555"
    fi
}

# 健康检查
health_check() {
    print_message $YELLOW "🏥 执行健康检查..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:8000/api/health > /dev/null 2>&1; then
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
    
    # 检查前端
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        print_message $GREEN "✅ 前端服务健康"
    else
        print_message $YELLOW "⚠️  前端服务可能还在启动中"
    fi
}

# 主函数
main() {
    local mode=${1:-"standard"}
    
    case $mode in
        "dev"|"development")
            print_message $BLUE "🔧 开发模式"
            check_dependencies
            check_env_file
            create_directories
            create_config_files
            start_services "dev"
            ;;
        "prod"|"production")
            print_message $BLUE "🏭 生产模式"
            check_dependencies
            check_env_file
            create_directories
            create_config_files
            start_services "production"
            health_check
            show_status
            ;;
        "monitor"|"monitoring")
            print_message $BLUE "📈 监控模式"
            check_dependencies
            check_env_file
            create_directories
            create_config_files
            start_services "monitoring"
            health_check
            show_status
            ;;
        "stop")
            print_message $BLUE "🛑 停止服务"
            docker-compose down
            print_message $GREEN "✅ 服务已停止"
            ;;
        "restart")
            print_message $BLUE "🔄 重启服务"
            docker-compose restart
            health_check
            show_status
            ;;
        "logs")
            print_message $BLUE "📜 查看日志"
            docker-compose logs -f --tail=100
            ;;
        "clean")
            print_message $BLUE "🧹 清理系统"
            docker-compose down -v
            docker system prune -f
            print_message $GREEN "✅ 清理完成"
            ;;
        "help"|"-h"|"--help")
            print_usage
            ;;
        *)
            print_message $BLUE "🌟 标准模式"
            check_dependencies
            check_env_file
            create_directories
            create_config_files
            start_services
            health_check
            show_status
            ;;
    esac
}

# 显示使用说明
print_usage() {
    cat << EOF
AI微调数据集生成器 - 启动脚本

用法: $0 [模式]

可用模式:
  standard    标准启动模式 (默认)
  dev         开发模式，仅启动基础服务
  prod        生产模式，包含Nginx和完整配置
  monitor     监控模式，包含Prometheus和Grafana
  stop        停止所有服务
  restart     重启所有服务
  logs        查看服务日志
  clean       清理所有容器和卷
  help        显示此帮助信息

示例:
  $0                # 标准启动
  $0 dev           # 开发模式
  $0 prod          # 生产模式
  $0 monitor       # 包含监控
  $0 stop          # 停止服务
  $0 logs          # 查看日志

更多信息请访问: https://github.com/your-repo/qa-generator
EOF
}

# 脚本入口
main "$@"