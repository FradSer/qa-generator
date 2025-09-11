"""
AI微调数据集生成器 - FastAPI后端主应用
支持知识蒸馏、多LLM提供商集成和成本优化
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import asyncio
import logging
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid
import os

# 导入我们的知识蒸馏模块
from backend.distillation import (
    create_distillation_system,
    DistillationConfig,
    GenerationRequest as DistillationRequest,
    CostBudget,
    OptimizationStrategy
)

from .models import (
    GenerationRequest,
    GenerationResponse,
    DatasetExportRequest,
    SystemStatus,
    CostAnalysis,
    QualityMetrics
)
from .database import get_database, DatasetRepository, GenerationRepository
from .services import (
    DatasetService,
    QualityService,
    CostService,
    ExportService
)
from .config import get_settings

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局变量存储知识蒸馏系统
distillation_manager = None
api_layer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global distillation_manager, api_layer
    
    logger.info("启动AI数据集生成器后端服务...")
    
    try:
        # 初始化知识蒸馏系统
        config_path = os.getenv("DISTILLATION_CONFIG", "config/distillation.json")
        distillation_manager, api_layer = create_distillation_system(config_path)
        logger.info("知识蒸馏系统初始化成功")
        
        yield
    except Exception as e:
        logger.error(f"初始化失败: {e}")
        raise
    finally:
        # 清理资源
        if distillation_manager:
            await distillation_manager.cleanup()
        logger.info("后端服务已关闭")

# 创建FastAPI应用
app = FastAPI(
    title="AI微调数据集生成器",
    description="基于LLM API和知识蒸馏技术的智能数据集生成平台",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 依赖注入
def get_dataset_service() -> DatasetService:
    return DatasetService(get_database())

def get_quality_service() -> QualityService:
    return QualityService()

def get_cost_service() -> CostService:
    return CostService()

def get_export_service() -> ExportService:
    return ExportService()


@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "distillation_system": distillation_manager is not None
    }


@app.post("/api/datasets/generate", response_model=GenerationResponse)
async def generate_dataset(
    request: GenerationRequest,
    background_tasks: BackgroundTasks,
    dataset_service: DatasetService = Depends(get_dataset_service)
):
    """
    生成AI训练数据集
    支持多种数据类型：问答、分类、文本生成、代码生成等
    """
    try:
        logger.info(f"接收数据生成请求: {request.data_type}, 数量: {request.quantity}")
        
        # 转换为内部请求格式
        distillation_req = DistillationRequest(
            keywords=request.keywords,
            data_type=request.data_type,
            quantity=request.quantity,
            quality_threshold=request.quality_threshold or 0.8
        )
        
        # 使用知识蒸馏生成数据
        result = await api_layer.handle_generation_request(distillation_req.__dict__)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 保存到数据库
        generation_id = str(uuid.uuid4())
        await dataset_service.save_generation(generation_id, request, result)
        
        # 构建响应
        response = GenerationResponse(
            generation_id=generation_id,
            status="completed",
            data=result["data"],
            quality_score=result["quality_score"],
            cost=result["cost"],
            generation_time=result["generation_time"],
            model_used=result["model_used"],
            metadata=result["metadata"],
            created_at=datetime.now()
        )
        
        logger.info(f"数据生成完成: {generation_id}, 质量分数: {response.quality_score}")
        return response
        
    except Exception as e:
        logger.error(f"数据生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/generation/{generation_id}")
async def get_generation_status(
    generation_id: str,
    dataset_service: DatasetService = Depends(get_dataset_service)
):
    """获取数据生成状态"""
    try:
        generation = await dataset_service.get_generation(generation_id)
        if not generation:
            raise HTTPException(status_code=404, detail="生成记录未找到")
        
        return generation
    except Exception as e:
        logger.error(f"获取生成状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets")
async def list_datasets(
    skip: int = 0,
    limit: int = 20,
    data_type: Optional[str] = None,
    dataset_service: DatasetService = Depends(get_dataset_service)
):
    """获取数据集列表"""
    try:
        datasets = await dataset_service.list_datasets(
            skip=skip, 
            limit=limit, 
            data_type=data_type
        )
        return datasets
    except Exception as e:
        logger.error(f"获取数据集列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/datasets/export")
async def export_dataset(
    request: DatasetExportRequest,
    export_service: ExportService = Depends(get_export_service)
):
    """导出数据集"""
    try:
        logger.info(f"导出数据集: {request.generation_id}, 格式: {request.format}")
        
        # 导出数据
        export_result = await export_service.export_dataset(
            generation_id=request.generation_id,
            export_format=request.format,
            include_metadata=request.include_metadata
        )
        
        if request.format in ["json", "jsonl", "csv"]:
            # 返回文件内容
            return StreamingResponse(
                io.BytesIO(export_result["content"].encode()),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f"attachment; filename={export_result['filename']}"
                }
            )
        else:
            # 返回下载链接
            return {"download_url": export_result["download_url"]}
            
    except Exception as e:
        logger.error(f"导出数据集失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/cost")
async def get_cost_analytics(
    days: int = 7,
    cost_service: CostService = Depends(get_cost_service)
):
    """获取成本分析"""
    try:
        analytics = await cost_service.get_cost_analytics(days)
        return analytics
    except Exception as e:
        logger.error(f"获取成本分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/quality")
async def get_quality_analytics(
    days: int = 7,
    quality_service: QualityService = Depends(get_quality_service)
):
    """获取质量分析"""
    try:
        analytics = await quality_service.get_quality_analytics(days)
        return analytics
    except Exception as e:
        logger.error(f"获取质量分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/datasets/validate")
async def validate_dataset(
    generation_id: str,
    sample_ratio: float = 0.1,
    quality_service: QualityService = Depends(get_quality_service)
):
    """验证数据集质量"""
    try:
        validation_result = await quality_service.validate_dataset(
            generation_id, sample_ratio
        )
        return validation_result
    except Exception as e:
        logger.error(f"数据集验证失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system/status")
async def get_system_status():
    """获取系统状态"""
    try:
        if not distillation_manager:
            raise HTTPException(status_code=503, detail="蒸馏系统未初始化")
        
        # 获取蒸馏系统状态
        distillation_status = distillation_manager.get_system_status()
        
        # 获取API层分析
        analytics = api_layer.get_analytics()
        
        status = SystemStatus(
            service_status="healthy",
            distillation_system_status=distillation_status,
            performance_metrics=analytics,
            timestamp=datetime.now()
        )
        
        return status
    except Exception as e:
        logger.error(f"获取系统状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/system/optimize")
async def optimize_system():
    """系统优化"""
    try:
        if not api_layer:
            raise HTTPException(status_code=503, detail="API层未初始化")
        
        # 获取优化报告
        optimization_report = await api_layer.get_optimization_report()
        
        return {
            "status": "completed",
            "optimization_report": optimization_report,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"系统优化失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/providers")
async def list_providers():
    """获取可用的LLM提供商列表"""
    try:
        if not distillation_manager:
            raise HTTPException(status_code=503, detail="蒸馏系统未初始化")
        
        providers = []
        for provider_key, provider in distillation_manager.providers.items():
            info = provider.get_model_info()
            providers.append({
                "key": provider_key,
                "provider": info["provider"],
                "model": info["model"],
                "pricing": info["pricing"],
                "role_suitability": info["role_suitability"]
            })
        
        return {"providers": providers}
    except Exception as e:
        logger.error(f"获取提供商列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data-types")
async def get_supported_data_types():
    """获取支持的数据类型"""
    return {
        "data_types": [
            {
                "id": "qa",
                "name": "问答对",
                "description": "FAQ生成、对话训练、知识问答",
                "examples": ["客服问答", "知识库问答", "对话系统训练"]
            },
            {
                "id": "classification",
                "name": "文本分类",
                "description": "新闻分类、情感分析、意图识别",
                "examples": ["情感分析", "主题分类", "意图识别"]
            },
            {
                "id": "generation",
                "name": "文本生成",
                "description": "创意写作、产品描述、代码注释",
                "examples": ["产品描述", "广告文案", "技术文档"]
            },
            {
                "id": "code",
                "name": "代码生成",
                "description": "编程问题和解答、代码补全",
                "examples": ["算法实现", "代码解释", "调试帮助"]
            },
            {
                "id": "translation",
                "name": "翻译对",
                "description": "多语言翻译训练数据",
                "examples": ["中英翻译", "多语言对话", "文档翻译"]
            },
            {
                "id": "ner",
                "name": "实体识别",
                "description": "实体识别、关系抽取、信息提取",
                "examples": ["人名识别", "地名提取", "关系抽取"]
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    # 获取配置
    settings = get_settings()
    
    # 启动服务器
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )