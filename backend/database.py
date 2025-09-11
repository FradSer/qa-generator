"""
数据库模型和操作
"""

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import json

from .config import database_config

# 数据库基类
Base = declarative_base()


class GenerationRecord(Base):
    """数据生成记录"""
    __tablename__ = "generation_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 请求信息
    keywords = Column(JSON, nullable=False)
    data_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    quality_threshold = Column(Float, default=0.8)
    
    # 生成结果
    status = Column(String, default="pending")
    generated_items = Column(Integer, default=0)
    quality_score = Column(Float)
    
    # 成本信息
    total_cost = Column(Float, default=0.0)
    teacher_cost = Column(Float, default=0.0)
    student_cost = Column(Float, default=0.0)
    
    # 模型信息
    models_used = Column(JSON)
    teacher_examples = Column(Integer, default=0)
    student_generated = Column(Integer, default=0)
    
    # 性能指标
    generation_time = Column(Float)
    
    # 元数据
    extra_metadata = Column(JSON, default=dict)
    project_name = Column(String)
    tags = Column(JSON, default=list)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)


class DatasetItem(Base):
    """数据集项目"""
    __tablename__ = "dataset_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    generation_id = Column(String, nullable=False)
    
    # 数据内容
    content = Column(Text, nullable=False)
    content_type = Column(String, default="text")
    
    # 质量信息
    quality_score = Column(Float)
    source = Column(String)  # teacher/student
    
    # 验证信息
    is_validated = Column(Boolean, default=False)
    validation_score = Column(Float)
    validation_notes = Column(Text)
    
    # 元数据
    extra_metadata = Column(JSON, default=dict)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)


class CostRecord(Base):
    """成本记录"""
    __tablename__ = "cost_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    generation_id = Column(String, nullable=False)
    
    # 成本详情
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    
    # Token使用
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # 成本
    input_cost = Column(Float, default=0.0)
    output_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)


class QualityValidation(Base):
    """质量验证记录"""
    __tablename__ = "quality_validations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    generation_id = Column(String, nullable=False)
    
    # 验证配置
    validation_type = Column(String, default="automatic")
    sample_ratio = Column(Float, default=0.1)
    sample_size = Column(Integer)
    
    # 验证结果
    overall_quality = Column(Float)
    relevance_score = Column(Float)
    diversity_score = Column(Float)
    consistency_score = Column(Float)
    language_quality = Column(Float)
    
    # 详细结果
    quality_distribution = Column(JSON, default=dict)
    failed_items_count = Column(Integer, default=0)
    recommendations = Column(JSON, default=list)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)


class SystemMetrics(Base):
    """系统指标"""
    __tablename__ = "system_metrics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 指标类型
    metric_type = Column(String, nullable=False)  # performance, cost, quality
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float)
    
    # 维度信息
    dimensions = Column(JSON, default=dict)
    
    # 时间戳
    timestamp = Column(DateTime, default=datetime.utcnow)


# 数据库连接
def get_engine():
    """获取数据库引擎"""
    return create_engine(
        database_config.url,
        echo=database_config.echo
    )


def get_async_engine():
    """获取异步数据库引擎"""
    return create_async_engine(
        database_config.get_async_url(),
        echo=database_config.echo
    )


# 会话管理
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
AsyncSessionLocal = sessionmaker(
    bind=get_async_engine(),
    class_=AsyncSession,
    autocommit=False,
    autoflush=False
)


def get_database() -> Session:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # 会话在使用后关闭


async def get_async_database() -> AsyncSession:
    """获取异步数据库会话"""
    async with AsyncSessionLocal() as session:
        yield session


# 数据访问对象
class DatasetRepository:
    """数据集仓库"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_generation_record(self, request_data: Dict[str, Any]) -> GenerationRecord:
        """创建数据生成记录"""
        record = GenerationRecord(
            keywords=request_data.get("keywords", []),
            data_type=request_data.get("data_type"),
            quantity=request_data.get("quantity"),
            quality_threshold=request_data.get("quality_threshold", 0.8),
            project_name=request_data.get("project_name"),
            tags=request_data.get("tags", [])
        )
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record
    
    async def update_generation_record(self, generation_id: str, update_data: Dict[str, Any]) -> Optional[GenerationRecord]:
        """更新生成记录"""
        record = self.db.query(GenerationRecord).filter(GenerationRecord.id == generation_id).first()
        if not record:
            return None
        
        for key, value in update_data.items():
            if hasattr(record, key):
                setattr(record, key, value)
        
        record.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(record)
        return record
    
    async def get_generation_record(self, generation_id: str) -> Optional[GenerationRecord]:
        """获取生成记录"""
        return self.db.query(GenerationRecord).filter(GenerationRecord.id == generation_id).first()
    
    async def list_generation_records(self, skip: int = 0, limit: int = 20, data_type: Optional[str] = None) -> List[GenerationRecord]:
        """获取生成记录列表"""
        query = self.db.query(GenerationRecord)
        
        if data_type:
            query = query.filter(GenerationRecord.data_type == data_type)
        
        return query.order_by(GenerationRecord.created_at.desc()).offset(skip).limit(limit).all()
    
    async def save_dataset_items(self, generation_id: str, items: List[Dict[str, Any]]) -> List[DatasetItem]:
        """保存数据集项目"""
        dataset_items = []
        
        for item_data in items:
            item = DatasetItem(
                generation_id=generation_id,
                content=json.dumps(item_data.get("content", {})),
                content_type=item_data.get("content_type", "text"),
                quality_score=item_data.get("quality_score"),
                source=item_data.get("source"),
                extra_metadata=item_data.get("metadata", {})
            )
            dataset_items.append(item)
        
        self.db.add_all(dataset_items)
        self.db.commit()
        
        for item in dataset_items:
            self.db.refresh(item)
        
        return dataset_items
    
    async def get_dataset_items(self, generation_id: str, limit: Optional[int] = None) -> List[DatasetItem]:
        """获取数据集项目"""
        query = self.db.query(DatasetItem).filter(DatasetItem.generation_id == generation_id)
        
        if limit:
            query = query.limit(limit)
        
        return query.all()


class GenerationRepository:
    """生成仓库"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def save_cost_record(self, generation_id: str, cost_data: Dict[str, Any]) -> CostRecord:
        """保存成本记录"""
        record = CostRecord(
            generation_id=generation_id,
            provider=cost_data.get("provider"),
            model=cost_data.get("model"),
            input_tokens=cost_data.get("input_tokens", 0),
            output_tokens=cost_data.get("output_tokens", 0),
            total_tokens=cost_data.get("total_tokens", 0),
            input_cost=cost_data.get("input_cost", 0.0),
            output_cost=cost_data.get("output_cost", 0.0),
            total_cost=cost_data.get("total_cost", 0.0)
        )
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record
    
    async def get_cost_records(self, generation_id: str) -> List[CostRecord]:
        """获取成本记录"""
        return self.db.query(CostRecord).filter(CostRecord.generation_id == generation_id).all()
    
    async def save_quality_validation(self, validation_data: Dict[str, Any]) -> QualityValidation:
        """保存质量验证记录"""
        record = QualityValidation(
            generation_id=validation_data.get("generation_id"),
            validation_type=validation_data.get("validation_type", "automatic"),
            sample_ratio=validation_data.get("sample_ratio", 0.1),
            sample_size=validation_data.get("sample_size"),
            overall_quality=validation_data.get("overall_quality"),
            relevance_score=validation_data.get("relevance_score"),
            diversity_score=validation_data.get("diversity_score"),
            consistency_score=validation_data.get("consistency_score"),
            language_quality=validation_data.get("language_quality"),
            quality_distribution=validation_data.get("quality_distribution", {}),
            failed_items_count=validation_data.get("failed_items_count", 0),
            recommendations=validation_data.get("recommendations", [])
        )
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record
    
    async def get_quality_validations(self, generation_id: str) -> List[QualityValidation]:
        """获取质量验证记录"""
        return self.db.query(QualityValidation).filter(QualityValidation.generation_id == generation_id).all()


def init_database():
    """初始化数据库"""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)