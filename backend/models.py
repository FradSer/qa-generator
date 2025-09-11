"""
数据模型定义
定义API的请求和响应模型
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum

# Import unified configuration from shared module
try:
    from shared.config import DataType as SharedDataType, OptimizationLevel as SharedOptimizationLevel
    # Use shared enums
    DataType = SharedDataType
    OptimizationLevel = SharedOptimizationLevel
except ImportError:
    # Fallback to local definitions if shared module not available
    class DataType(str, Enum):
        """支持的数据类型"""
        QA = "qa"
        TRANSLATION = "translation"
    
    class OptimizationLevel(str, Enum):
        """优化级别"""
        COST_FIRST = "cost_first"
        QUALITY_FIRST = "quality_first"
        BALANCED = "balanced"
        ADAPTIVE = "adaptive"


class ExportFormat(str, Enum):
    """导出格式"""
    JSON = "json"
    JSONL = "jsonl"
    CSV = "csv"
    HUGGINGFACE = "huggingface"
    OPENAI = "openai_jsonl"
    PYTORCH = "pytorch"
    TENSORFLOW = "tensorflow"


class GenerationRequest(BaseModel):
    """数据生成请求"""
    keywords: List[str] = Field(..., description="关键词列表", min_items=1)
    data_type: DataType = Field(..., description="数据类型")
    quantity: int = Field(..., description="生成数量", ge=1, le=10000)
    quality_threshold: Optional[float] = Field(0.8, description="质量阈值", ge=0.0, le=1.0)
    
    # 成本控制
    budget_limit: Optional[float] = Field(None, description="预算限制(美元)")
    cost_per_item_limit: Optional[float] = Field(None, description="单项成本限制")
    
    # 优化策略
    optimization_strategy: Optional[OptimizationLevel] = Field(
        OptimizationLevel.BALANCED, 
        description="优化策略"
    )
    
    # 高级选项
    use_distillation: bool = Field(True, description="是否使用知识蒸馏")
    teacher_ratio: Optional[float] = Field(0.2, description="教师模型比例", ge=0.05, le=0.5)
    enable_caching: bool = Field(True, description="启用模式缓存")
    
    # 领域特定配置
    domain_specific: Optional[Dict[str, Any]] = Field({}, description="领域特定配置")
    
    # 元数据
    project_name: Optional[str] = Field(None, description="项目名称")
    tags: List[str] = Field([], description="标签")
    
    @validator('keywords')
    def validate_keywords(cls, v):
        if not v or len(v) == 0:
            raise ValueError("关键词不能为空")
        return [keyword.strip() for keyword in v if keyword.strip()]
    
    @validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("数量必须大于0")
        if v > 10000:
            raise ValueError("单次生成数量不能超过10000")
        return v


class DataItem(BaseModel):
    """单个数据项"""
    id: str = Field(..., description="数据ID")
    content: Union[str, Dict[str, Any]] = Field(..., description="数据内容")
    quality_score: float = Field(..., description="质量分数", ge=0.0, le=1.0)
    source: str = Field(..., description="数据来源（teacher/student）")
    metadata: Dict[str, Any] = Field({}, description="元数据")
    created_at: datetime = Field(..., description="创建时间")


class GenerationResponse(BaseModel):
    """数据生成响应"""
    generation_id: str = Field(..., description="生成ID")
    status: str = Field(..., description="状态")
    
    # 生成数据
    data: List[DataItem] = Field(..., description="生成的数据")
    
    # 质量指标
    quality_score: float = Field(..., description="平均质量分数")
    quality_distribution: Optional[Dict[str, int]] = Field(None, description="质量分布")
    
    # 成本信息
    cost: float = Field(..., description="总成本")
    cost_breakdown: Optional[Dict[str, float]] = Field(None, description="成本明细")
    
    # 性能指标
    generation_time: float = Field(..., description="生成时间(秒)")
    models_used: str = Field(..., description="使用的模型")
    
    # 蒸馏信息
    distillation_metrics: Optional[Dict[str, Any]] = Field(None, description="蒸馏指标")
    teacher_examples: Optional[int] = Field(None, description="教师示例数量")
    student_generated: Optional[int] = Field(None, description="学生生成数量")
    
    # 元数据
    metadata: Dict[str, Any] = Field({}, description="其他元数据")
    created_at: datetime = Field(..., description="创建时间")


class DatasetExportRequest(BaseModel):
    """数据集导出请求"""
    generation_id: str = Field(..., description="生成ID")
    format: ExportFormat = Field(..., description="导出格式")
    include_metadata: bool = Field(True, description="包含元数据")
    compression: Optional[str] = Field(None, description="压缩格式(zip/gzip)")
    
    # 过滤选项
    quality_threshold: Optional[float] = Field(None, description="质量阈值过滤")
    max_items: Optional[int] = Field(None, description="最大项目数")
    
    # 格式特定选项
    format_options: Optional[Dict[str, Any]] = Field({}, description="格式特定选项")


class QualityMetrics(BaseModel):
    """质量指标"""
    overall_score: float = Field(..., description="总体质量分数")
    relevance_score: float = Field(..., description="相关性分数")
    diversity_score: float = Field(..., description="多样性分数")
    consistency_score: float = Field(..., description="一致性分数")
    language_quality: float = Field(..., description="语言质量")
    
    # 详细分析
    quality_distribution: Dict[str, int] = Field(..., description="质量分布")
    common_issues: List[str] = Field([], description="常见问题")
    improvement_suggestions: List[str] = Field([], description="改进建议")


class CostAnalysis(BaseModel):
    """成本分析"""
    total_cost: float = Field(..., description="总成本")
    cost_per_item: float = Field(..., description="单项成本")
    
    # 成本分解
    teacher_cost: float = Field(..., description="教师模型成本")
    student_cost: float = Field(..., description="学生模型成本")
    validation_cost: float = Field(..., description="验证成本")
    
    # 成本对比
    traditional_cost_estimate: Optional[float] = Field(None, description="传统方法成本估算")
    savings: Optional[float] = Field(None, description="节省金额")
    savings_percentage: Optional[float] = Field(None, description="节省比例")
    
    # 时间段分析
    daily_cost: Optional[float] = Field(None, description="日成本")
    monthly_projection: Optional[float] = Field(None, description="月度预测")


class SystemStatus(BaseModel):
    """系统状态"""
    service_status: str = Field(..., description="服务状态")
    
    # 蒸馏系统状态
    distillation_system_status: Dict[str, Any] = Field(..., description="蒸馏系统状态")
    
    # 性能指标
    performance_metrics: Dict[str, Any] = Field(..., description="性能指标")
    
    # 资源使用
    resource_usage: Optional[Dict[str, Any]] = Field(None, description="资源使用情况")
    
    timestamp: datetime = Field(..., description="时间戳")


class ProviderInfo(BaseModel):
    """LLM提供商信息"""
    key: str = Field(..., description="提供商键")
    provider: str = Field(..., description="提供商名称")
    model: str = Field(..., description="模型名称")
    pricing: tuple = Field(..., description="定价信息(输入,输出)")
    role_suitability: Dict[str, float] = Field(..., description="角色适用性")
    status: str = Field(..., description="状态")
    
    # 性能统计
    average_response_time: Optional[float] = Field(None, description="平均响应时间")
    success_rate: Optional[float] = Field(None, description="成功率")
    cost_efficiency: Optional[float] = Field(None, description="成本效率")


class ValidationRequest(BaseModel):
    """验证请求"""
    generation_id: str = Field(..., description="生成ID")
    sample_ratio: float = Field(0.1, description="采样比例", ge=0.01, le=1.0)
    validation_type: str = Field("automatic", description="验证类型")
    custom_criteria: Optional[List[str]] = Field(None, description="自定义验证标准")


class ValidationResponse(BaseModel):
    """验证响应"""
    validation_id: str = Field(..., description="验证ID")
    overall_quality: float = Field(..., description="整体质量")
    sample_size: int = Field(..., description="样本数量")
    
    # 详细结果
    quality_breakdown: Dict[str, float] = Field(..., description="质量细分")
    failed_items: List[Dict[str, Any]] = Field([], description="失败项目")
    recommendations: List[str] = Field([], description="建议")
    
    # 统计信息
    statistics: Dict[str, Any] = Field({}, description="统计信息")
    created_at: datetime = Field(..., description="创建时间")


class OptimizationReport(BaseModel):
    """优化报告"""
    report_id: str = Field(..., description="报告ID")
    analysis_period: str = Field(..., description="分析周期")
    
    # 成本优化
    cost_optimization: Dict[str, Any] = Field(..., description="成本优化建议")
    
    # 质量优化
    quality_optimization: Dict[str, Any] = Field(..., description="质量优化建议")
    
    # 性能优化
    performance_optimization: Dict[str, Any] = Field(..., description="性能优化建议")
    
    # 模型建议
    recommendation_list: List[Dict[str, Any]] = Field([], description="模型建议")
    
    created_at: datetime = Field(..., description="创建时间")


class DatasetMetadata(BaseModel):
    """数据集元数据"""
    dataset_id: str = Field(..., description="数据集ID")
    name: str = Field(..., description="数据集名称")
    description: Optional[str] = Field(None, description="描述")
    
    # 基本信息
    data_type: DataType = Field(..., description="数据类型")
    total_items: int = Field(..., description="总项目数")
    keywords: List[str] = Field(..., description="关键词")
    
    # 质量信息
    average_quality: float = Field(..., description="平均质量")
    quality_range: tuple = Field(..., description="质量范围")
    
    # 生成信息
    generation_cost: float = Field(..., description="生成成本")
    generation_time: float = Field(..., description="生成时间")
    models_used: List[str] = Field(..., description="使用的模型")
    
    # 使用统计
    download_count: int = Field(0, description="下载次数")
    last_accessed: Optional[datetime] = Field(None, description="最后访问时间")
    
    # 标签和分类
    tags: List[str] = Field([], description="标签")
    category: Optional[str] = Field(None, description="类别")
    
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class BatchGenerationRequest(BaseModel):
    """批量生成请求"""
    requests: List[GenerationRequest] = Field(..., description="批量请求", min_items=1, max_items=10)
    parallel_execution: bool = Field(True, description="并行执行")
    fail_fast: bool = Field(False, description="快速失败")
    
    # 全局设置
    global_budget_limit: Optional[float] = Field(None, description="全局预算限制")
    global_optimization: Optional[OptimizationLevel] = Field(None, description="全局优化策略")


class BatchGenerationResponse(BaseModel):
    """批量生成响应"""
    batch_id: str = Field(..., description="批次ID")
    total_requests: int = Field(..., description="总请求数")
    completed_requests: int = Field(..., description="已完成请求数")
    failed_requests: int = Field(..., description="失败请求数")
    
    # 结果列表
    results: List[Union[GenerationResponse, Dict[str, str]]] = Field(..., description="结果列表")
    
    # 批次统计
    total_cost: float = Field(..., description="总成本")
    total_time: float = Field(..., description="总时间")
    average_quality: float = Field(..., description="平均质量")
    
    created_at: datetime = Field(..., description="创建时间")