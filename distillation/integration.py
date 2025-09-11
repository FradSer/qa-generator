"""
Integration layer for Knowledge Distillation with existing dataset generator
Provides seamless integration with the AI dataset generator architecture
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
import uuid
from pathlib import Path

from .core import (
    KnowledgeDistillationOrchestrator, TeacherModel, StudentModel,
    GenerationRequest, GenerationResponse, DistillationStrategy
)
from .providers import ProviderFactory, ProviderConfig, CostOptimizer
from .transfer import KnowledgeTransferEngine, AdaptiveLearningManager

logger = logging.getLogger(__name__)


@dataclass
class DistillationConfig:
    """Configuration for knowledge distillation system"""
    teacher_models: List[Dict[str, Any]]
    student_models: List[Dict[str, Any]]
    strategy: DistillationStrategy = DistillationStrategy.RESPONSE_BASED
    quality_threshold: float = 0.8
    cost_optimization: bool = True
    adaptive_learning: bool = True
    cache_patterns: bool = True
    max_teacher_examples: int = 50
    student_batch_size: int = 20
    validation_sample_ratio: float = 0.1


class DistillationManager:
    """Main manager for knowledge distillation operations"""
    
    def __init__(self, config: DistillationConfig):
        self.config = config
        self.providers: Dict[str, Any] = {}
        self.orchestrators: Dict[str, KnowledgeDistillationOrchestrator] = {}
        self.cost_optimizer: Optional[CostOptimizer] = None
        self.transfer_engine = KnowledgeTransferEngine()
        self.adaptive_manager = AdaptiveLearningManager()
        self.pattern_cache: Dict[str, Any] = {}
        
        # Initialize providers
        self._initialize_providers()
        self._initialize_orchestrators()
    
    def _initialize_providers(self):
        """Initialize LLM providers from config"""
        for teacher_config in self.config.teacher_models:
            provider_type = teacher_config["provider_type"]
            model_config = ProviderConfig(**teacher_config["config"])
            provider = ProviderFactory.create_provider(provider_type, model_config)
            
            key = f"teacher_{teacher_config['name']}"
            self.providers[key] = provider
        
        for student_config in self.config.student_models:
            provider_type = student_config["provider_type"]
            model_config = ProviderConfig(**student_config["config"])
            provider = ProviderFactory.create_provider(provider_type, model_config)
            
            key = f"student_{student_config['name']}"
            self.providers[key] = provider
        
        # Initialize cost optimizer
        if self.config.cost_optimization:
            self.cost_optimizer = CostOptimizer(self.providers)
    
    def _initialize_orchestrators(self):
        """Initialize orchestrators for different model pairs"""
        teacher_keys = [k for k in self.providers.keys() if k.startswith("teacher_")]
        student_keys = [k for k in self.providers.keys() if k.startswith("student_")]
        
        for teacher_key in teacher_keys:
            for student_key in student_keys:
                teacher_provider = self.providers[teacher_key]
                student_provider = self.providers[student_key]
                
                teacher_model = TeacherModel(teacher_provider, teacher_key)
                student_model = StudentModel(student_provider, student_key)
                
                orchestrator = KnowledgeDistillationOrchestrator(teacher_model, student_model)
                orchestrator_key = f"{teacher_key}_{student_key}"
                self.orchestrators[orchestrator_key] = orchestrator
    
    async def generate_dataset_with_distillation(self, request: GenerationRequest) -> GenerationResponse:
        """Generate dataset using knowledge distillation"""
        logger.info(f"Starting distilled generation: {request.quantity} items, strategy: {request.strategy}")
        
        # Select optimal orchestrator
        orchestrator_key = self._select_optimal_orchestrator(request)
        orchestrator = self.orchestrators[orchestrator_key]
        
        # Check for cached patterns
        if self.config.cache_patterns:
            cached_patterns = self._get_cached_patterns(request.keywords, request.data_type)
            if cached_patterns:
                logger.info("Using cached patterns for generation")
                # Apply cached patterns to student model
                await self._apply_cached_patterns(orchestrator.student, cached_patterns)
        
        # Generate dataset
        response = await orchestrator.generate_dataset(request)
        
        # Cache patterns for future use
        if self.config.cache_patterns:
            await self._cache_patterns(request, response)
        
        # Update cost tracking
        if self.cost_optimizer:
            self.cost_optimizer.track_usage(
                orchestrator_key,
                response.metadata.get("tokens_used", 0),
                response.cost
            )
        
        return response
    
    def _select_optimal_orchestrator(self, request: GenerationRequest) -> str:
        """Select the best orchestrator for the request"""
        if self.cost_optimizer:
            # Factor in cost, quality, and task complexity
            complexity = self._estimate_task_complexity(request)
            best_provider = self.cost_optimizer.get_cheapest_provider_for_task(complexity)
            
            # Find orchestrator with this provider
            for key in self.orchestrators.keys():
                if best_provider in key:
                    return key
        
        # Fallback to first available orchestrator
        return list(self.orchestrators.keys())[0]
    
    def _estimate_task_complexity(self, request: GenerationRequest) -> float:
        """Estimate complexity of the generation task"""
        complexity = 0.5  # Base complexity
        
        # Adjust based on data type
        complexity_map = {
            "classification": 0.3,
            "qa": 0.6,
            "generation": 0.8,
            "code": 0.9,
            "translation": 0.7
        }
        complexity = complexity_map.get(request.data_type, 0.5)
        
        # Adjust based on quantity
        if request.quantity > 1000:
            complexity += 0.1
        
        # Adjust based on quality threshold
        if request.quality_threshold > 0.9:
            complexity += 0.2
        
        return min(1.0, complexity)
    
    def _get_cached_patterns(self, keywords: List[str], data_type: str) -> Optional[Dict[str, Any]]:
        """Get cached patterns matching the request"""
        cache_key = f"{data_type}_{hash(tuple(sorted(keywords)))}"
        return self.pattern_cache.get(cache_key)
    
    async def _apply_cached_patterns(self, student_model: StudentModel, patterns: Dict[str, Any]):
        """Apply cached patterns to student model"""
        student_model.learned_patterns.update(patterns)
        logger.info(f"Applied {len(patterns)} cached patterns")
    
    async def _cache_patterns(self, request: GenerationRequest, response: GenerationResponse):
        """Cache patterns for future use"""
        cache_key = f"{request.data_type}_{hash(tuple(sorted(request.keywords)))}"
        
        # Extract patterns from response metadata
        if "learned_patterns" in response.metadata:
            self.pattern_cache[cache_key] = response.metadata["learned_patterns"]
            logger.info(f"Cached patterns for key: {cache_key}")
    
    async def optimize_model_selection(self, historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Optimize model selection based on historical performance"""
        if not historical_data:
            return {"status": "no_data"}
        
        # Analyze performance by model pair
        performance_by_model = {}
        cost_by_model = {}
        
        for data in historical_data:
            model_used = data.get("model_used", "unknown")
            quality = data.get("quality_score", 0)
            cost = data.get("cost", 0)
            
            if model_used not in performance_by_model:
                performance_by_model[model_used] = []
                cost_by_model[model_used] = []
            
            performance_by_model[model_used].append(quality)
            cost_by_model[model_used].append(cost)
        
        # Calculate averages
        recommendations = {}
        for model in performance_by_model:
            avg_quality = sum(performance_by_model[model]) / len(performance_by_model[model])
            avg_cost = sum(cost_by_model[model]) / len(cost_by_model[model])
            
            # Calculate efficiency score (quality/cost ratio)
            efficiency = avg_quality / max(avg_cost, 0.001)
            
            recommendations[model] = {
                "average_quality": avg_quality,
                "average_cost": avg_cost,
                "efficiency_score": efficiency,
                "sample_count": len(performance_by_model[model])
            }
        
        # Find best model
        best_model = max(recommendations.keys(), key=lambda x: recommendations[x]["efficiency_score"])
        
        return {
            "status": "optimized",
            "best_model": best_model,
            "recommendations": recommendations,
            "analysis_date": datetime.now().isoformat()
        }
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status and metrics"""
        status = {
            "providers": len(self.providers),
            "orchestrators": len(self.orchestrators),
            "cached_patterns": len(self.pattern_cache),
            "cost_optimization_enabled": self.config.cost_optimization,
            "adaptive_learning_enabled": self.config.adaptive_learning
        }
        
        if self.cost_optimizer:
            status["usage_report"] = self.cost_optimizer.get_usage_report()
        
        return status
    
    async def cleanup(self):
        """Cleanup resources"""
        for provider in self.providers.values():
            if hasattr(provider, 'session') and provider.session:
                await provider.session.close()


class APIIntegrationLayer:
    """Integration layer for REST API endpoints"""
    
    def __init__(self, distillation_manager: DistillationManager):
        self.manager = distillation_manager
        self.request_history: List[Dict[str, Any]] = []
    
    async def handle_generation_request(self, api_request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming generation request from API"""
        try:
            # Convert API request to GenerationRequest
            generation_request = self._convert_api_request(api_request)
            
            # Generate dataset with distillation
            response = await self.manager.generate_dataset_with_distillation(generation_request)
            
            # Convert to API response format
            api_response = self._convert_to_api_response(response)
            
            # Store request history
            self.request_history.append({
                "request": api_request,
                "response": api_response,
                "timestamp": datetime.now()
            })
            
            return api_response
            
        except Exception as e:
            logger.error(f"Generation request failed: {e}")
            return {
                "error": str(e),
                "status": "failed",
                "timestamp": datetime.now().isoformat()
            }
    
    def _convert_api_request(self, api_request: Dict[str, Any]) -> GenerationRequest:
        """Convert API request to internal GenerationRequest"""
        return GenerationRequest(
            keywords=api_request.get("keywords", []),
            data_type=api_request.get("data_type", "qa"),
            quantity=api_request.get("quantity", 10),
            quality_threshold=api_request.get("quality_threshold", 0.8),
            strategy=DistillationStrategy(api_request.get("strategy", "response_based"))
        )
    
    def _convert_to_api_response(self, response: GenerationResponse) -> Dict[str, Any]:
        """Convert internal response to API response format"""
        return {
            "id": response.id,
            "data": response.data,
            "quality_score": response.quality_score,
            "cost": response.cost,
            "model_used": response.model_used,
            "generation_time": response.generation_time,
            "metadata": response.metadata,
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_optimization_report(self) -> Dict[str, Any]:
        """Get optimization report based on request history"""
        if not self.request_history:
            return {"status": "no_data", "message": "No historical data available"}
        
        historical_data = [
            {
                "model_used": item["response"].get("model_used", "unknown"),
                "quality_score": item["response"].get("quality_score", 0),
                "cost": item["response"].get("cost", 0),
                "generation_time": item["response"].get("generation_time", 0)
            }
            for item in self.request_history
        ]
        
        return await self.manager.optimize_model_selection(historical_data)
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get analytics based on request history"""
        if not self.request_history:
            return {"status": "no_data"}
        
        total_requests = len(self.request_history)
        successful_requests = len([r for r in self.request_history if "error" not in r["response"]])
        
        quality_scores = [r["response"].get("quality_score", 0) for r in self.request_history 
                         if "quality_score" in r["response"]]
        costs = [r["response"].get("cost", 0) for r in self.request_history 
                if "cost" in r["response"]]
        
        return {
            "total_requests": total_requests,
            "success_rate": successful_requests / total_requests if total_requests > 0 else 0,
            "average_quality": sum(quality_scores) / len(quality_scores) if quality_scores else 0,
            "total_cost": sum(costs),
            "average_cost_per_request": sum(costs) / len(costs) if costs else 0,
            "data_generated": sum(len(r["response"].get("data", [])) for r in self.request_history),
            "system_status": self.manager.get_system_status()
        }


class ConfigurationManager:
    """Manages configuration for distillation system"""
    
    @staticmethod
    def load_config(config_path: str) -> DistillationConfig:
        """Load configuration from file"""
        try:
            with open(config_path, 'r') as f:
                config_data = json.load(f)
            
            return DistillationConfig(**config_data)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return ConfigurationManager.get_default_config()
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return ConfigurationManager.get_default_config()
    
    @staticmethod
    def get_default_config() -> DistillationConfig:
        """Get default configuration"""
        return DistillationConfig(
            teacher_models=[
                {
                    "name": "gpt4",
                    "provider_type": "openai",
                    "config": {
                        "api_key": "your-openai-key",
                        "base_url": "https://api.openai.com/v1",
                        "model_name": "gpt-4o",
                        "max_tokens": 4000,
                        "rate_limit_per_minute": 30
                    }
                }
            ],
            student_models=[
                {
                    "name": "gpt3.5",
                    "provider_type": "openai",
                    "config": {
                        "api_key": "your-openai-key",
                        "base_url": "https://api.openai.com/v1",
                        "model_name": "gpt-3.5-turbo",
                        "max_tokens": 2000,
                        "rate_limit_per_minute": 60
                    }
                }
            ]
        )
    
    @staticmethod
    def save_config(config: DistillationConfig, config_path: str):
        """Save configuration to file"""
        config_dict = {
            "teacher_models": config.teacher_models,
            "student_models": config.student_models,
            "strategy": config.strategy.value,
            "quality_threshold": config.quality_threshold,
            "cost_optimization": config.cost_optimization,
            "adaptive_learning": config.adaptive_learning,
            "cache_patterns": config.cache_patterns,
            "max_teacher_examples": config.max_teacher_examples,
            "student_batch_size": config.student_batch_size,
            "validation_sample_ratio": config.validation_sample_ratio
        }
        
        Path(config_path).parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, 'w') as f:
            json.dump(config_dict, f, indent=2)
    
    @staticmethod
    def validate_config(config: DistillationConfig) -> List[str]:
        """Validate configuration and return list of issues"""
        issues = []
        
        if not config.teacher_models:
            issues.append("No teacher models configured")
        
        if not config.student_models:
            issues.append("No student models configured")
        
        if config.quality_threshold < 0 or config.quality_threshold > 1:
            issues.append("Quality threshold must be between 0 and 1")
        
        if config.max_teacher_examples < 1:
            issues.append("max_teacher_examples must be at least 1")
        
        if config.student_batch_size < 1:
            issues.append("student_batch_size must be at least 1")
        
        # Validate provider configurations
        for i, teacher in enumerate(config.teacher_models):
            if "config" not in teacher or "api_key" not in teacher["config"]:
                issues.append(f"Teacher model {i} missing API key")
        
        for i, student in enumerate(config.student_models):
            if "config" not in student or "api_key" not in student["config"]:
                issues.append(f"Student model {i} missing API key")
        
        return issues


# Factory function for easy integration
def create_distillation_system(config_path: Optional[str] = None) -> tuple[DistillationManager, APIIntegrationLayer]:
    """Factory function to create a complete distillation system"""
    
    # Load configuration
    if config_path:
        config = ConfigurationManager.load_config(config_path)
    else:
        config = ConfigurationManager.get_default_config()
    
    # Validate configuration
    issues = ConfigurationManager.validate_config(config)
    if issues:
        logger.warning(f"Configuration issues: {issues}")
    
    # Create manager and integration layer
    manager = DistillationManager(config)
    integration = APIIntegrationLayer(manager)
    
    return manager, integration