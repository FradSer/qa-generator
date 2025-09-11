"""
Knowledge Distillation Package for AI Dataset Generator

This package implements advanced knowledge distillation techniques for efficient
dataset generation using teacher-student LLM architectures.

Key Features:
- Teacher-Student model framework
- Multi-provider LLM integration (OpenAI, Anthropic, Google, Local)
- Advanced pattern extraction and knowledge transfer
- Intelligent cost optimization
- Real-time quality validation
- Comprehensive analytics and monitoring

Usage:
    from distillation import create_distillation_system
    
    manager, api_layer = create_distillation_system("config.json")
    
    request = {
        "keywords": ["AI", "machine learning"],
        "data_type": "qa", 
        "quantity": 100,
        "quality_threshold": 0.8
    }
    
    response = await api_layer.handle_generation_request(request)
"""

__version__ = "1.0.0"
__author__ = "AI Dataset Generator Team"

# Core components
from .core import (
    GenerationRequest,
    GenerationResponse, 
    TeacherExample,
    DistillationStrategy,
    KnowledgeDistillationOrchestrator,
    TeacherModel,
    StudentModel,
    QualityValidator
)

# Provider integrations
from .providers import (
    ProviderConfig,
    ProviderFactory,
    OpenAIProvider,
    AnthropicProvider,
    GoogleProvider,
    LocalLlamaProvider,
    CostOptimizer
)

# Knowledge transfer
from .transfer import (
    KnowledgePattern,
    PatternExtractor,
    KnowledgeTransferEngine,
    PerformanceTracker,
    AdaptiveLearningManager
)

# Integration layer
from .integration import (
    DistillationConfig,
    DistillationManager,
    APIIntegrationLayer,
    ConfigurationManager,
    create_distillation_system
)

# Cost optimization
from .cost_optimizer import (
    IntelligentCostOptimizer,
    CostBudget,
    ModelCostProfile,
    OptimizationStrategy,
    BudgetTracker,
    DynamicPricingManager
)

__all__ = [
    # Core
    "GenerationRequest",
    "GenerationResponse",
    "TeacherExample", 
    "DistillationStrategy",
    "KnowledgeDistillationOrchestrator",
    "TeacherModel",
    "StudentModel",
    "QualityValidator",
    
    # Providers
    "ProviderConfig",
    "ProviderFactory", 
    "OpenAIProvider",
    "AnthropicProvider",
    "GoogleProvider",
    "LocalLlamaProvider",
    "CostOptimizer",
    
    # Transfer
    "KnowledgePattern",
    "PatternExtractor",
    "KnowledgeTransferEngine",
    "PerformanceTracker",
    "AdaptiveLearningManager",
    
    # Integration
    "DistillationConfig",
    "DistillationManager",
    "APIIntegrationLayer", 
    "ConfigurationManager",
    "create_distillation_system",
    
    # Cost optimization
    "IntelligentCostOptimizer",
    "CostBudget",
    "ModelCostProfile",
    "OptimizationStrategy",
    "BudgetTracker",
    "DynamicPricingManager"
]