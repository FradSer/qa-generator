"""
统一配置类
前后端共享的数据生成配置定义
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime


class DataType(str, Enum):
    """数据类型枚举"""
    QA = "qa"
    TRANSLATION = "translation"


class OptimizationLevel(str, Enum):
    """优化策略枚举"""
    COST_FIRST = "cost_first"
    QUALITY_FIRST = "quality_first"
    BALANCED = "balanced"
    ADAPTIVE = "adaptive"


class Language(str, Enum):
    """语言枚举"""
    ZH = "zh"
    EN = "en"
    MIXED = "mixed"


@dataclass
class QualityConfig:
    """质量配置"""
    threshold: float = 0.8  # 0.6 - 0.95
    min_threshold: float = 0.6
    max_threshold: float = 0.95
    step: float = 0.05
    
    def __post_init__(self):
        if not (self.min_threshold <= self.threshold <= self.max_threshold):
            raise ValueError(f"质量阈值必须在 {self.min_threshold} 到 {self.max_threshold} 之间")


@dataclass
class CostConfig:
    """成本配置"""
    budget_limit: Optional[float] = None  # USD
    cost_per_item_limit: Optional[float] = None  # USD per item
    optimization_strategy: OptimizationLevel = OptimizationLevel.BALANCED


@dataclass
class DistillationConfig:
    """知识蒸馏配置"""
    enabled: bool = True
    teacher_ratio: float = 0.2  # 0.1 - 0.3
    min_teacher_ratio: float = 0.1
    max_teacher_ratio: float = 0.3
    step: float = 0.05
    enable_caching: bool = True
    
    def __post_init__(self):
        if not (self.min_teacher_ratio <= self.teacher_ratio <= self.max_teacher_ratio):
            raise ValueError(f"教师模型比例必须在 {self.min_teacher_ratio} 到 {self.max_teacher_ratio} 之间")


@dataclass
class GenerationConfig:
    """统一的数据生成配置类"""
    
    # 基础配置
    keywords: List[str]
    data_type: DataType
    quantity: int
    language: Language = Language.ZH
    
    # 质量配置
    quality: QualityConfig = None
    
    # 成本配置
    cost: CostConfig = None
    
    # 蒸馏配置
    distillation: DistillationConfig = None
    
    # 元数据
    project_name: Optional[str] = None
    tags: List[str] = None
    
    # 时间戳
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        # 设置默认值
        if self.quality is None:
            self.quality = QualityConfig()
        if self.cost is None:
            self.cost = CostConfig()
        if self.distillation is None:
            self.distillation = DistillationConfig()
        if self.tags is None:
            self.tags = []
        if self.created_at is None:
            self.created_at = datetime.now()
            
        # 验证数量
        if not (1 <= self.quantity <= 10000):
            raise ValueError("生成数量必须在 1 到 10000 之间")
            
        # 验证关键词
        if not self.keywords or len(self.keywords) == 0:
            raise ValueError("关键词不能为空")
            
        self.keywords = [kw.strip() for kw in self.keywords if kw.strip()]
        
        if len(self.keywords) == 0:
            raise ValueError("有效关键词不能为空")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式，用于API传输"""
        return {
            "keywords": self.keywords,
            "data_type": self.data_type.value,
            "quantity": self.quantity,
            "language": self.language.value,
            "quality_threshold": self.quality.threshold,
            "budget_limit": self.cost.budget_limit,
            "cost_per_item_limit": self.cost.cost_per_item_limit,
            "optimization_strategy": self.cost.optimization_strategy.value,
            "use_distillation": self.distillation.enabled,
            "teacher_ratio": self.distillation.teacher_ratio,
            "enable_caching": self.distillation.enable_caching,
            "project_name": self.project_name,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GenerationConfig':
        """从字典创建配置对象"""
        quality_config = QualityConfig(
            threshold=data.get("quality_threshold", 0.8)
        )
        
        cost_config = CostConfig(
            budget_limit=data.get("budget_limit"),
            cost_per_item_limit=data.get("cost_per_item_limit"),
            optimization_strategy=OptimizationLevel(
                data.get("optimization_strategy", OptimizationLevel.BALANCED.value)
            )
        )
        
        distillation_config = DistillationConfig(
            enabled=data.get("use_distillation", True),
            teacher_ratio=data.get("teacher_ratio", 0.2),
            enable_caching=data.get("enable_caching", True)
        )
        
        created_at = None
        if data.get("created_at"):
            created_at = datetime.fromisoformat(data["created_at"])
        
        return cls(
            keywords=data["keywords"],
            data_type=DataType(data["data_type"]),
            quantity=data["quantity"],
            language=Language(data.get("language", Language.ZH.value)),
            quality=quality_config,
            cost=cost_config,
            distillation=distillation_config,
            project_name=data.get("project_name"),
            tags=data.get("tags", []),
            created_at=created_at
        )
    
    def get_cost_estimate(self) -> Dict[str, float]:
        """获取成本估算（占位符方法）"""
        # 这里可以集成实际的成本计算逻辑
        base_cost = self.quantity * 0.01
        if self.distillation.enabled:
            teacher_cost = self.quantity * self.distillation.teacher_ratio * 0.05
            student_cost = self.quantity * (1 - self.distillation.teacher_ratio) * 0.005
        else:
            teacher_cost = self.quantity * 0.05
            student_cost = 0
        
        total_cost = teacher_cost + student_cost
        traditional_cost = self.quantity * 0.05
        savings = traditional_cost - total_cost
        savings_percentage = (savings / traditional_cost) * 100 if traditional_cost > 0 else 0
        
        return {
            "estimated_cost": total_cost,
            "cost_per_item": total_cost / self.quantity if self.quantity > 0 else 0,
            "teacher_cost": teacher_cost,
            "student_cost": student_cost,
            "traditional_cost": traditional_cost,
            "potential_savings": savings,
            "savings_percentage": savings_percentage
        }


class ConfigDefaults:
    """配置默认值和常量"""
    
    QUANTITY_OPTIONS = [100, 500, 1000, 2000, 5000]
    
    QUALITY_PRESETS = [
        {
            "name": "高效模式",
            "threshold": 0.65,
            "description": "优先成本效益，适合大规模数据生成",
            "teacher_ratio": 0.1
        },
        {
            "name": "平衡模式",
            "threshold": 0.8,
            "description": "质量与成本平衡，推荐选择",
            "teacher_ratio": 0.2
        },
        {
            "name": "高质量模式",
            "threshold": 0.9,
            "description": "优先质量，适合关键应用场景",
            "teacher_ratio": 0.3
        }
    ]
    
    DATA_TYPE_OPTIONS = [
        {
            "value": DataType.QA,
            "label": "问答对 (Q&A)",
            "description": "生成问题-答案对，适合对话系统和知识问答"
        },
        {
            "value": DataType.TRANSLATION,
            "label": "机器翻译",
            "description": "生成翻译对，适合多语言模型训练"
        }
    ]
    
    OPTIMIZATION_OPTIONS = [
        {
            "value": OptimizationLevel.COST_FIRST,
            "label": "成本优先",
            "description": "最大化成本节省，适合大规模数据生成"
        },
        {
            "value": OptimizationLevel.BALANCED,
            "label": "平衡模式",
            "description": "质量与成本平衡，推荐选择"
        },
        {
            "value": OptimizationLevel.QUALITY_FIRST,
            "label": "质量优先",
            "description": "最大化数据质量，适合关键应用"
        },
        {
            "value": OptimizationLevel.ADAPTIVE,
            "label": "自适应",
            "description": "根据数据特点自动调整策略"
        }
    ]


def validate_config(config: GenerationConfig) -> List[str]:
    """验证配置并返回错误列表"""
    errors = []
    
    # 基础验证在 __post_init__ 中已完成
    
    # 成本验证
    if config.cost.budget_limit is not None and config.cost.budget_limit <= 0:
        errors.append("预算限制必须大于0")
    
    if config.cost.cost_per_item_limit is not None and config.cost.cost_per_item_limit <= 0:
        errors.append("单项成本限制必须大于0")
    
    # 预算可行性检查
    if config.cost.budget_limit is not None:
        estimated_cost = config.get_cost_estimate()["estimated_cost"]
        if estimated_cost > config.cost.budget_limit:
            errors.append(f"预估成本 ${estimated_cost:.2f} 超出预算限制 ${config.cost.budget_limit:.2f}")
    
    return errors


if __name__ == "__main__":
    # 测试示例
    config = GenerationConfig(
        keywords=["人工智能", "机器学习"],
        data_type=DataType.QA,
        quantity=1000,
        language=Language.ZH
    )
    
    print("配置字典:", config.to_dict())
    print("成本估算:", config.get_cost_estimate())
    
    # 验证配置
    errors = validate_config(config)
    if errors:
        print("配置错误:", errors)
    else:
        print("配置验证通过")