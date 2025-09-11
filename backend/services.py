"""
业务服务层
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import uuid
import io
import csv
import zipfile
from sqlalchemy.orm import Session

from .database import (
    DatasetRepository, GenerationRepository, 
    GenerationRecord, DatasetItem, CostRecord
)
from .models import GenerationRequest, DataItem

logger = logging.getLogger(__name__)


class DatasetService:
    """数据集服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.dataset_repo = DatasetRepository(db)
        self.generation_repo = GenerationRepository(db)
    
    async def save_generation(self, generation_id: str, request: GenerationRequest, result: Dict[str, Any]):
        """保存生成结果"""
        try:
            # 创建生成记录
            record_data = {
                "keywords": request.keywords,
                "data_type": request.data_type,
                "quantity": request.quantity,
                "quality_threshold": request.quality_threshold,
                "project_name": request.project_name,
                "tags": request.tags
            }
            
            # 先查找记录，如果不存在则创建
            record = await self.dataset_repo.get_generation_record(generation_id)
            if not record:
                record_data["id"] = generation_id
                record = GenerationRecord(**record_data)
                self.db.add(record)
            
            # 更新结果信息
            update_data = {
                "status": "completed",
                "generated_items": len(result.get("data", [])),
                "quality_score": result.get("quality_score"),
                "total_cost": result.get("cost"),
                "models_used": [result.get("model_used")],
                "generation_time": result.get("generation_time"),
                "metadata": result.get("metadata", {}),
                "completed_at": datetime.utcnow()
            }
            
            for key, value in update_data.items():
                if hasattr(record, key):
                    setattr(record, key, value)
            
            self.db.commit()
            
            # 保存数据集项目
            if result.get("data"):
                await self.dataset_repo.save_dataset_items(generation_id, result["data"])
            
            logger.info(f"保存生成结果成功: {generation_id}")
            
        except Exception as e:
            logger.error(f"保存生成结果失败: {e}")
            self.db.rollback()
            raise
    
    async def get_generation(self, generation_id: str) -> Optional[Dict[str, Any]]:
        """获取生成记录"""
        record = await self.dataset_repo.get_generation_record(generation_id)
        if not record:
            return None
        
        # 获取数据项目
        items = await self.dataset_repo.get_dataset_items(generation_id, limit=10)
        
        return {
            "generation_id": record.id,
            "status": record.status,
            "data_type": record.data_type,
            "keywords": record.keywords,
            "quantity": record.quantity,
            "generated_items": record.generated_items,
            "quality_score": record.quality_score,
            "total_cost": record.total_cost,
            "generation_time": record.generation_time,
            "created_at": record.created_at,
            "sample_items": [
                {
                    "id": item.id,
                    "content": json.loads(item.content) if item.content else {},
                    "quality_score": item.quality_score,
                    "source": item.source
                }
                for item in items
            ]
        }
    
    async def list_datasets(self, skip: int = 0, limit: int = 20, data_type: Optional[str] = None) -> Dict[str, Any]:
        """获取数据集列表"""
        records = await self.dataset_repo.list_generation_records(skip, limit, data_type)
        
        datasets = []
        for record in records:
            datasets.append({
                "generation_id": record.id,
                "data_type": record.data_type,
                "keywords": record.keywords,
                "quantity": record.quantity,
                "generated_items": record.generated_items,
                "quality_score": record.quality_score,
                "total_cost": record.total_cost,
                "status": record.status,
                "created_at": record.created_at,
                "project_name": record.project_name,
                "tags": record.tags
            })
        
        return {
            "datasets": datasets,
            "total": len(datasets),
            "skip": skip,
            "limit": limit
        }


class QualityService:
    """质量服务"""
    
    def __init__(self):
        pass
    
    async def get_quality_analytics(self, days: int = 7) -> Dict[str, Any]:
        """获取质量分析"""
        # 模拟质量分析数据
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        return {
            "period": f"last_{days}_days",
            "average_quality": 0.85,
            "quality_trend": [
                {"date": "2024-01-15", "quality": 0.82},
                {"date": "2024-01-16", "quality": 0.84},
                {"date": "2024-01-17", "quality": 0.86},
                {"date": "2024-01-18", "quality": 0.85},
                {"date": "2024-01-19", "quality": 0.87},
                {"date": "2024-01-20", "quality": 0.86},
                {"date": "2024-01-21", "quality": 0.88}
            ],
            "quality_distribution": {
                "excellent": 35,  # 0.9+
                "good": 45,       # 0.8-0.9
                "fair": 15,       # 0.7-0.8
                "poor": 5         # <0.7
            },
            "common_issues": [
                "语法错误",
                "内容重复",
                "相关性不足",
                "格式不一致"
            ],
            "improvement_suggestions": [
                "增加语法检查",
                "提高多样性",
                "优化关键词匹配",
                "统一数据格式"
            ]
        }
    
    async def validate_dataset(self, generation_id: str, sample_ratio: float = 0.1) -> Dict[str, Any]:
        """验证数据集质量"""
        try:
            logger.info(f"开始验证数据集: {generation_id}")
            
            # 模拟质量验证过程
            await asyncio.sleep(1)  # 模拟验证时间
            
            validation_result = {
                "validation_id": str(uuid.uuid4()),
                "generation_id": generation_id,
                "overall_quality": 0.85,
                "sample_size": int(1000 * sample_ratio),
                "quality_breakdown": {
                    "relevance": 0.88,
                    "diversity": 0.82,
                    "consistency": 0.87,
                    "language_quality": 0.84
                },
                "failed_items": [],
                "recommendations": [
                    "提高多样性以避免重复内容",
                    "加强语言质量检查",
                    "优化关键词相关性"
                ],
                "statistics": {
                    "total_validated": int(1000 * sample_ratio),
                    "passed": int(1000 * sample_ratio * 0.85),
                    "failed": int(1000 * sample_ratio * 0.15),
                    "validation_time": 1.2
                },
                "created_at": datetime.now()
            }
            
            logger.info(f"数据集验证完成: {generation_id}, 质量分数: {validation_result['overall_quality']}")
            return validation_result
            
        except Exception as e:
            logger.error(f"数据集验证失败: {e}")
            raise


class CostService:
    """成本服务"""
    
    def __init__(self):
        pass
    
    async def get_cost_analytics(self, days: int = 7) -> Dict[str, Any]:
        """获取成本分析"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # 模拟成本分析数据
        return {
            "period": f"last_{days}_days",
            "total_cost": 45.67,
            "daily_costs": [
                {"date": "2024-01-15", "cost": 6.23},
                {"date": "2024-01-16", "cost": 7.89},
                {"date": "2024-01-17", "cost": 5.45},
                {"date": "2024-01-18", "cost": 8.12},
                {"date": "2024-01-19", "cost": 6.78},
                {"date": "2024-01-20", "cost": 5.90},
                {"date": "2024-01-21", "cost": 5.30}
            ],
            "cost_breakdown": {
                "teacher_models": 18.27,  # 40%
                "student_models": 22.84,  # 50%
                "validation": 4.56        # 10%
            },
            "provider_costs": {
                "openai": 28.90,
                "anthropic": 12.34,
                "google": 4.43
            },
            "cost_per_item": 0.0456,
            "savings_vs_traditional": {
                "traditional_cost_estimate": 228.35,
                "actual_cost": 45.67,
                "savings": 182.68,
                "savings_percentage": 80.0
            },
            "monthly_projection": 195.43,
            "optimization_suggestions": [
                "增加学生模型使用比例",
                "利用缓存减少重复调用",
                "选择更经济的时段进行生成"
            ]
        }
    
    async def estimate_cost(self, request: GenerationRequest) -> Dict[str, Any]:
        """估算生成成本"""
        # 基础成本估算
        base_costs = {
            "qa": 0.02,
            "classification": 0.015,
            "generation": 0.03,
            "code": 0.04,
            "translation": 0.025,
            "ner": 0.02
        }
        
        base_cost_per_item = base_costs.get(request.data_type, 0.02)
        estimated_total = request.quantity * base_cost_per_item
        
        # 考虑质量阈值影响
        quality_multiplier = 1 + (request.quality_threshold - 0.8) * 0.5
        estimated_total *= quality_multiplier
        
        # 考虑蒸馏优化
        if request.use_distillation:
            distillation_savings = 0.7  # 30%节省
            estimated_total *= distillation_savings
        
        return {
            "estimated_total_cost": round(estimated_total, 4),
            "cost_per_item": round(estimated_total / request.quantity, 4),
            "breakdown": {
                "base_cost": round(request.quantity * base_cost_per_item, 4),
                "quality_adjustment": round(estimated_total - request.quantity * base_cost_per_item, 4),
                "distillation_savings": round(request.quantity * base_cost_per_item * (1 - distillation_savings), 4) if request.use_distillation else 0
            },
            "budget_check": {
                "within_budget": request.budget_limit is None or estimated_total <= request.budget_limit,
                "budget_utilization": (estimated_total / request.budget_limit * 100) if request.budget_limit else None
            }
        }


class ExportService:
    """导出服务"""
    
    def __init__(self):
        pass
    
    async def export_dataset(self, generation_id: str, export_format: str, include_metadata: bool = True) -> Dict[str, Any]:
        """导出数据集"""
        try:
            logger.info(f"开始导出数据集: {generation_id}, 格式: {export_format}")
            
            # 模拟获取数据
            sample_data = [
                {
                    "id": f"item_{i}",
                    "content": {
                        "question": f"这是问题 {i}？",
                        "answer": f"这是答案 {i}。"
                    },
                    "quality_score": 0.85 + (i % 10) * 0.01,
                    "source": "student" if i % 3 else "teacher",
                    "metadata": {
                        "keywords": ["AI", "机器学习"],
                        "created_at": datetime.now().isoformat()
                    } if include_metadata else {}
                }
                for i in range(1, 21)  # 示例20条数据
            ]
            
            # 根据格式导出
            if export_format == "json":
                content = json.dumps(sample_data, ensure_ascii=False, indent=2)
                filename = f"dataset_{generation_id}.json"
            
            elif export_format == "jsonl":
                content = "\n".join(json.dumps(item, ensure_ascii=False) for item in sample_data)
                filename = f"dataset_{generation_id}.jsonl"
            
            elif export_format == "csv":
                output = io.StringIO()
                if sample_data:
                    # 扁平化数据用于CSV
                    flattened_data = []
                    for item in sample_data:
                        flat_item = {
                            "id": item["id"],
                            "question": item["content"].get("question", ""),
                            "answer": item["content"].get("answer", ""),
                            "quality_score": item["quality_score"],
                            "source": item["source"]
                        }
                        if include_metadata and item.get("metadata"):
                            flat_item.update({
                                f"meta_{k}": v for k, v in item["metadata"].items()
                            })
                        flattened_data.append(flat_item)
                    
                    writer = csv.DictWriter(output, fieldnames=flattened_data[0].keys())
                    writer.writeheader()
                    writer.writerows(flattened_data)
                
                content = output.getvalue()
                filename = f"dataset_{generation_id}.csv"
            
            elif export_format == "huggingface":
                # Hugging Face datasets格式
                hf_data = {
                    "data": sample_data,
                    "info": {
                        "description": f"AI生成的训练数据集 {generation_id}",
                        "version": "1.0.0",
                        "created_at": datetime.now().isoformat(),
                        "features": {
                            "question": "string",
                            "answer": "string",
                            "quality_score": "float",
                            "source": "string"
                        }
                    }
                }
                content = json.dumps(hf_data, ensure_ascii=False, indent=2)
                filename = f"dataset_{generation_id}_hf.json"
            
            elif export_format == "openai_jsonl":
                # OpenAI fine-tuning格式
                openai_data = []
                for item in sample_data:
                    openai_item = {
                        "messages": [
                            {"role": "user", "content": item["content"].get("question", "")},
                            {"role": "assistant", "content": item["content"].get("answer", "")}
                        ]
                    }
                    openai_data.append(openai_item)
                
                content = "\n".join(json.dumps(item, ensure_ascii=False) for item in openai_data)
                filename = f"dataset_{generation_id}_openai.jsonl"
            
            else:
                raise ValueError(f"不支持的导出格式: {export_format}")
            
            logger.info(f"数据集导出完成: {filename}")
            
            return {
                "filename": filename,
                "content": content,
                "size": len(content.encode('utf-8')),
                "format": export_format,
                "item_count": len(sample_data),
                "created_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"数据集导出失败: {e}")
            raise


class BatchService:
    """批量处理服务"""
    
    def __init__(self, dataset_service: DatasetService):
        self.dataset_service = dataset_service
    
    async def process_batch_requests(self, requests: List[GenerationRequest], parallel: bool = True) -> Dict[str, Any]:
        """处理批量请求"""
        batch_id = str(uuid.uuid4())
        results = []
        
        try:
            if parallel:
                # 并行处理
                tasks = [self._process_single_request(req) for req in requests]
                results = await asyncio.gather(*tasks, return_exceptions=True)
            else:
                # 串行处理
                for request in requests:
                    result = await self._process_single_request(request)
                    results.append(result)
            
            # 统计结果
            completed = len([r for r in results if not isinstance(r, Exception)])
            failed = len([r for r in results if isinstance(r, Exception)])
            
            return {
                "batch_id": batch_id,
                "total_requests": len(requests),
                "completed_requests": completed,
                "failed_requests": failed,
                "results": results,
                "created_at": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"批量处理失败: {e}")
            raise
    
    async def _process_single_request(self, request: GenerationRequest) -> Dict[str, Any]:
        """处理单个请求"""
        try:
            # 这里应该调用实际的生成服务
            # 目前返回模拟结果
            generation_id = str(uuid.uuid4())
            
            # 模拟处理时间
            await asyncio.sleep(0.5)
            
            return {
                "generation_id": generation_id,
                "status": "completed",
                "data_type": request.data_type,
                "quantity": request.quantity,
                "cost": request.quantity * 0.02
            }
            
        except Exception as e:
            return {"error": str(e), "request": request.dict()}