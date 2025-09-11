"""
Advanced Cost Optimization for Knowledge Distillation
Implements intelligent cost management strategies for LLM-based dataset generation
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from enum import Enum

logger = logging.getLogger(__name__)


class OptimizationStrategy(Enum):
    COST_FIRST = "cost_first"
    QUALITY_FIRST = "quality_first"
    BALANCED = "balanced"
    ADAPTIVE = "adaptive"


@dataclass
class CostBudget:
    """Budget constraints for dataset generation"""
    total_budget: float
    daily_budget: Optional[float] = None
    hourly_budget: Optional[float] = None
    cost_per_item_limit: Optional[float] = None
    quality_cost_ratio_min: float = 1.0  # Minimum quality/cost ratio


@dataclass
class ModelCostProfile:
    """Cost profile for a model"""
    provider: str
    model_name: str
    input_cost_per_token: float
    output_cost_per_token: float
    quality_rating: float  # 0-1 scale
    speed_rating: float   # requests per minute
    reliability_rating: float  # 0-1 scale, based on success rate
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class GenerationCostEstimate:
    """Cost estimate for a generation task"""
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost: float
    estimated_time: float
    quality_expectation: float
    confidence: float


class IntelligentCostOptimizer:
    """Advanced cost optimizer with machine learning-like optimization"""
    
    def __init__(self):
        self.model_profiles: Dict[str, ModelCostProfile] = {}
        self.cost_history: List[Dict[str, Any]] = []
        self.quality_history: List[Dict[str, Any]] = []
        self.optimization_rules: Dict[str, Any] = {}
        self.budget_tracker = BudgetTracker()
        self.dynamic_pricing = DynamicPricingManager()
    
    def register_model_profile(self, profile: ModelCostProfile):
        """Register a model's cost profile"""
        key = f"{profile.provider}_{profile.model_name}"
        self.model_profiles[key] = profile
        logger.info(f"Registered model profile: {key}")
    
    def estimate_generation_cost(self, request: Dict[str, Any], 
                                model_key: str) -> GenerationCostEstimate:
        """Estimate cost for a generation request"""
        if model_key not in self.model_profiles:
            raise ValueError(f"Unknown model: {model_key}")
        
        profile = self.model_profiles[model_key]
        
        # Estimate token usage based on request parameters
        input_tokens = self._estimate_input_tokens(request)
        output_tokens = self._estimate_output_tokens(request)
        
        # Calculate cost
        input_cost = (input_tokens / 1000) * profile.input_cost_per_token
        output_cost = (output_tokens / 1000) * profile.output_cost_per_token
        total_cost = input_cost + output_cost
        
        # Estimate time
        estimated_time = request.get('quantity', 1) / profile.speed_rating
        
        return GenerationCostEstimate(
            estimated_input_tokens=input_tokens,
            estimated_output_tokens=output_tokens,
            estimated_cost=total_cost,
            estimated_time=estimated_time,
            quality_expectation=profile.quality_rating,
            confidence=profile.reliability_rating
        )
    
    def optimize_model_selection(self, request: Dict[str, Any], 
                                budget: CostBudget,
                                strategy: OptimizationStrategy = OptimizationStrategy.BALANCED) -> Dict[str, Any]:
        """Select optimal model configuration based on request and budget"""
        
        candidates = []
        
        # Evaluate all available models
        for model_key, profile in self.model_profiles.items():
            try:
                estimate = self.estimate_generation_cost(request, model_key)
                
                # Check budget constraints
                if not self._meets_budget_constraints(estimate, budget):
                    continue
                
                # Calculate optimization score based on strategy
                score = self._calculate_optimization_score(estimate, strategy)
                
                candidates.append({
                    "model_key": model_key,
                    "profile": profile,
                    "estimate": estimate,
                    "score": score
                })
                
            except Exception as e:
                logger.warning(f"Failed to evaluate model {model_key}: {e}")
        
        if not candidates:
            raise ValueError("No models meet the budget constraints")
        
        # Sort by optimization score
        candidates.sort(key=lambda x: x["score"], reverse=True)
        best_candidate = candidates[0]
        
        # Generate recommendation with alternatives
        return {
            "recommended_model": best_candidate["model_key"],
            "estimated_cost": best_candidate["estimate"].estimated_cost,
            "estimated_quality": best_candidate["estimate"].quality_expectation,
            "estimated_time": best_candidate["estimate"].estimated_time,
            "alternatives": [
                {
                    "model": c["model_key"],
                    "cost": c["estimate"].estimated_cost,
                    "quality": c["estimate"].quality_expectation,
                    "score": c["score"]
                }
                for c in candidates[1:5]  # Top 5 alternatives
            ],
            "strategy_used": strategy.value,
            "budget_utilization": best_candidate["estimate"].estimated_cost / budget.total_budget
        }
    
    def optimize_teacher_student_allocation(self, request: Dict[str, Any], 
                                          budget: CostBudget) -> Dict[str, Any]:
        """Optimize allocation between teacher and student models"""
        
        total_quantity = request.get('quantity', 100)
        quality_threshold = request.get('quality_threshold', 0.8)
        
        # Find optimal split ratio
        best_allocation = None
        best_score = -1
        
        # Test different allocation ratios
        for teacher_ratio in np.arange(0.05, 0.5, 0.05):  # 5% to 50% teacher
            student_ratio = 1 - teacher_ratio
            
            teacher_quantity = int(total_quantity * teacher_ratio)
            student_quantity = total_quantity - teacher_quantity
            
            # Estimate costs for teacher and student models
            teacher_model = self._select_best_teacher_model(request)
            student_model = self._select_best_student_model(request)
            
            teacher_request = {**request, 'quantity': teacher_quantity}
            student_request = {**request, 'quantity': student_quantity}
            
            teacher_estimate = self.estimate_generation_cost(teacher_request, teacher_model)
            student_estimate = self.estimate_generation_cost(student_request, student_model)
            
            total_cost = teacher_estimate.estimated_cost + student_estimate.estimated_cost
            
            # Check budget constraint
            if total_cost > budget.total_budget:
                continue
            
            # Calculate expected quality (weighted by quantity)
            expected_quality = (
                teacher_estimate.quality_expectation * teacher_ratio +
                student_estimate.quality_expectation * student_ratio
            )
            
            # Check quality threshold
            if expected_quality < quality_threshold:
                continue
            
            # Calculate optimization score
            efficiency = expected_quality / total_cost
            score = efficiency * (1 - abs(teacher_ratio - 0.2))  # Prefer ~20% teacher ratio
            
            if score > best_score:
                best_score = score
                best_allocation = {
                    "teacher_model": teacher_model,
                    "student_model": student_model,
                    "teacher_quantity": teacher_quantity,
                    "student_quantity": student_quantity,
                    "teacher_cost": teacher_estimate.estimated_cost,
                    "student_cost": student_estimate.estimated_cost,
                    "total_cost": total_cost,
                    "expected_quality": expected_quality,
                    "teacher_ratio": teacher_ratio,
                    "efficiency_score": efficiency
                }
        
        return best_allocation or {"error": "No viable allocation found"}
    
    def track_actual_performance(self, model_key: str, request: Dict[str, Any], 
                               actual_cost: float, actual_quality: float, actual_time: float):
        """Track actual performance to improve future estimates"""
        
        performance_record = {
            "model_key": model_key,
            "request": request,
            "actual_cost": actual_cost,
            "actual_quality": actual_quality,
            "actual_time": actual_time,
            "timestamp": datetime.now()
        }
        
        self.cost_history.append(performance_record)
        self.quality_history.append(performance_record)
        
        # Update model profile based on actual performance
        self._update_model_profile(model_key, performance_record)
        
        # Update optimization rules
        self._update_optimization_rules(performance_record)
    
    def _estimate_input_tokens(self, request: Dict[str, Any]) -> int:
        """Estimate input tokens for a request"""
        base_prompt_tokens = 100  # Base system prompt
        keyword_tokens = len(request.get('keywords', [])) * 5
        context_tokens = len(str(request.get('context', ''))) // 4  # Rough token estimate
        
        return base_prompt_tokens + keyword_tokens + context_tokens
    
    def _estimate_output_tokens(self, request: Dict[str, Any]) -> int:
        """Estimate output tokens for a request"""
        data_type = request.get('data_type', 'qa')
        quantity = request.get('quantity', 1)
        
        # Token estimates per item by data type
        tokens_per_item = {
            'qa': 50,
            'classification': 20,
            'generation': 100,
            'code': 150,
            'translation': 80
        }
        
        return tokens_per_item.get(data_type, 75) * quantity
    
    def _meets_budget_constraints(self, estimate: GenerationCostEstimate, 
                                 budget: CostBudget) -> bool:
        """Check if estimate meets budget constraints"""
        if estimate.estimated_cost > budget.total_budget:
            return False
        
        if budget.cost_per_item_limit:
            cost_per_item = estimate.estimated_cost / max(1, estimate.estimated_output_tokens // 50)
            if cost_per_item > budget.cost_per_item_limit:
                return False
        
        if budget.quality_cost_ratio_min:
            quality_cost_ratio = estimate.quality_expectation / max(0.001, estimate.estimated_cost)
            if quality_cost_ratio < budget.quality_cost_ratio_min:
                return False
        
        return True
    
    def _calculate_optimization_score(self, estimate: GenerationCostEstimate, 
                                    strategy: OptimizationStrategy) -> float:
        """Calculate optimization score based on strategy"""
        
        cost_score = 1.0 / (estimate.estimated_cost + 0.001)  # Lower cost = higher score
        quality_score = estimate.quality_expectation
        speed_score = 1.0 / (estimate.estimated_time + 0.001)
        confidence_score = estimate.confidence
        
        if strategy == OptimizationStrategy.COST_FIRST:
            return cost_score * 0.7 + quality_score * 0.2 + confidence_score * 0.1
        elif strategy == OptimizationStrategy.QUALITY_FIRST:
            return quality_score * 0.7 + confidence_score * 0.2 + cost_score * 0.1
        elif strategy == OptimizationStrategy.BALANCED:
            return cost_score * 0.3 + quality_score * 0.3 + speed_score * 0.2 + confidence_score * 0.2
        else:  # ADAPTIVE
            # Adapt based on historical performance
            return self._calculate_adaptive_score(estimate)
    
    def _calculate_adaptive_score(self, estimate: GenerationCostEstimate) -> float:
        """Calculate adaptive score based on historical performance"""
        # Simple adaptive scoring - can be enhanced with ML
        base_score = estimate.quality_expectation / (estimate.estimated_cost + 0.001)
        
        # Adjust based on recent performance trends
        if len(self.cost_history) > 10:
            recent_performance = self.cost_history[-10:]
            avg_quality = np.mean([p['actual_quality'] for p in recent_performance])
            avg_cost = np.mean([p['actual_cost'] for p in recent_performance])
            
            if avg_quality < 0.7:  # Poor recent quality, prioritize quality
                base_score *= (1 + estimate.quality_expectation)
            elif avg_cost > np.percentile([p['actual_cost'] for p in recent_performance], 75):
                base_score *= (1 + 1.0 / (estimate.estimated_cost + 0.001))
        
        return base_score
    
    def _select_best_teacher_model(self, request: Dict[str, Any]) -> str:
        """Select best teacher model for the request"""
        teacher_models = [k for k in self.model_profiles.keys() 
                         if self.model_profiles[k].quality_rating > 0.8]
        
        if not teacher_models:
            return list(self.model_profiles.keys())[0]
        
        # Return highest quality teacher model
        return max(teacher_models, key=lambda k: self.model_profiles[k].quality_rating)
    
    def _select_best_student_model(self, request: Dict[str, Any]) -> str:
        """Select best student model for the request"""
        student_models = [k for k in self.model_profiles.keys() 
                         if self.model_profiles[k].input_cost_per_token < 0.01]  # Cost-effective models
        
        if not student_models:
            return list(self.model_profiles.keys())[0]
        
        # Return best cost-effective model
        return min(student_models, key=lambda k: self.model_profiles[k].input_cost_per_token)
    
    def _update_model_profile(self, model_key: str, performance_record: Dict[str, Any]):
        """Update model profile based on actual performance"""
        if model_key not in self.model_profiles:
            return
        
        profile = self.model_profiles[model_key]
        
        # Update quality rating using exponential moving average
        actual_quality = performance_record['actual_quality']
        profile.quality_rating = 0.9 * profile.quality_rating + 0.1 * actual_quality
        
        # Update reliability rating
        profile.reliability_rating = 0.95 * profile.reliability_rating + 0.05 * 1.0  # Success
        
        profile.last_updated = datetime.now()
    
    def _update_optimization_rules(self, performance_record: Dict[str, Any]):
        """Update optimization rules based on performance"""
        # Simple rule learning - can be enhanced
        model_key = performance_record['model_key']
        
        if model_key not in self.optimization_rules:
            self.optimization_rules[model_key] = {'performance_history': []}
        
        self.optimization_rules[model_key]['performance_history'].append({
            'quality': performance_record['actual_quality'],
            'cost': performance_record['actual_cost'],
            'timestamp': performance_record['timestamp']
        })
        
        # Keep only last 100 records
        if len(self.optimization_rules[model_key]['performance_history']) > 100:
            self.optimization_rules[model_key]['performance_history'] = \
                self.optimization_rules[model_key]['performance_history'][-100:]


class BudgetTracker:
    """Tracks and manages budget consumption"""
    
    def __init__(self):
        self.daily_spending: Dict[str, float] = defaultdict(float)  # date -> amount
        self.hourly_spending: Dict[str, float] = defaultdict(float)  # hour -> amount
        self.total_spending = 0.0
        self.budget_alerts: List[Dict[str, Any]] = []
    
    def track_spending(self, amount: float, timestamp: Optional[datetime] = None):
        """Track spending amount"""
        if timestamp is None:
            timestamp = datetime.now()
        
        self.total_spending += amount
        
        # Track daily spending
        date_key = timestamp.strftime('%Y-%m-%d')
        self.daily_spending[date_key] += amount
        
        # Track hourly spending
        hour_key = timestamp.strftime('%Y-%m-%d %H')
        self.hourly_spending[hour_key] += amount
    
    def check_budget_constraints(self, budget: CostBudget, 
                               additional_cost: float = 0) -> Dict[str, Any]:
        """Check if additional cost would violate budget constraints"""
        now = datetime.now()
        issues = []
        
        # Check total budget
        if self.total_spending + additional_cost > budget.total_budget:
            issues.append({
                "type": "total_budget_exceeded",
                "current": self.total_spending,
                "limit": budget.total_budget,
                "additional": additional_cost
            })
        
        # Check daily budget
        if budget.daily_budget:
            today = now.strftime('%Y-%m-%d')
            daily_spent = self.daily_spending[today]
            if daily_spent + additional_cost > budget.daily_budget:
                issues.append({
                    "type": "daily_budget_exceeded",
                    "current": daily_spent,
                    "limit": budget.daily_budget,
                    "additional": additional_cost
                })
        
        # Check hourly budget
        if budget.hourly_budget:
            current_hour = now.strftime('%Y-%m-%d %H')
            hourly_spent = self.hourly_spending[current_hour]
            if hourly_spent + additional_cost > budget.hourly_budget:
                issues.append({
                    "type": "hourly_budget_exceeded",
                    "current": hourly_spent,
                    "limit": budget.hourly_budget,
                    "additional": additional_cost
                })
        
        return {
            "within_budget": len(issues) == 0,
            "issues": issues,
            "remaining_total": budget.total_budget - self.total_spending,
            "utilization": self.total_spending / budget.total_budget
        }
    
    def get_spending_report(self, days: int = 7) -> Dict[str, Any]:
        """Get spending report for the last N days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        daily_report = {}
        total_period_spending = 0
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            date_key = date.strftime('%Y-%m-%d')
            spending = self.daily_spending.get(date_key, 0)
            daily_report[date_key] = spending
            total_period_spending += spending
        
        return {
            "period": f"last_{days}_days",
            "daily_spending": daily_report,
            "total_period_spending": total_period_spending,
            "average_daily_spending": total_period_spending / days,
            "total_all_time": self.total_spending
        }


class DynamicPricingManager:
    """Manages dynamic pricing optimization"""
    
    def __init__(self):
        self.pricing_history: List[Dict[str, Any]] = []
        self.peak_hours: List[int] = [9, 10, 11, 14, 15, 16]  # Business hours
        self.off_peak_discount = 0.1
    
    def get_optimal_timing(self, request: Dict[str, Any], 
                          budget: CostBudget) -> Dict[str, Any]:
        """Determine optimal timing for request execution"""
        current_hour = datetime.now().hour
        
        # Check if current time is peak or off-peak
        is_peak_time = current_hour in self.peak_hours
        
        # Calculate potential savings by waiting
        base_cost = request.get('estimated_cost', 0)
        
        if is_peak_time:
            off_peak_cost = base_cost * (1 - self.off_peak_discount)
            savings = base_cost - off_peak_cost
            
            next_off_peak = self._get_next_off_peak_hour()
            
            return {
                "immediate_execution": {
                    "cost": base_cost,
                    "timing": "peak_hours"
                },
                "delayed_execution": {
                    "cost": off_peak_cost,
                    "savings": savings,
                    "next_optimal_time": next_off_peak,
                    "timing": "off_peak"
                },
                "recommendation": "delay" if savings > base_cost * 0.05 else "immediate"
            }
        else:
            return {
                "immediate_execution": {
                    "cost": base_cost,
                    "timing": "off_peak"
                },
                "recommendation": "immediate"
            }
    
    def _get_next_off_peak_hour(self) -> str:
        """Get next off-peak hour"""
        now = datetime.now()
        
        # Find next off-peak hour
        for hour_offset in range(1, 24):
            check_time = now + timedelta(hours=hour_offset)
            if check_time.hour not in self.peak_hours:
                return check_time.strftime('%Y-%m-%d %H:00')
        
        # Fallback to midnight
        tomorrow_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0)
        return tomorrow_midnight.strftime('%Y-%m-%d %H:00')
    
    def track_pricing_performance(self, execution_time: datetime, 
                                cost: float, quality: float):
        """Track pricing performance for analysis"""
        self.pricing_history.append({
            "execution_time": execution_time,
            "hour": execution_time.hour,
            "is_peak": execution_time.hour in self.peak_hours,
            "cost": cost,
            "quality": quality,
            "efficiency": quality / cost if cost > 0 else 0
        })
        
        # Keep only last 1000 records
        if len(self.pricing_history) > 1000:
            self.pricing_history = self.pricing_history[-1000:]
    
    def analyze_pricing_patterns(self) -> Dict[str, Any]:
        """Analyze pricing patterns to optimize timing"""
        if len(self.pricing_history) < 10:
            return {"status": "insufficient_data"}
        
        peak_records = [r for r in self.pricing_history if r['is_peak']]
        off_peak_records = [r for r in self.pricing_history if not r['is_peak']]
        
        if not peak_records or not off_peak_records:
            return {"status": "insufficient_data"}
        
        peak_avg_cost = np.mean([r['cost'] for r in peak_records])
        off_peak_avg_cost = np.mean([r['cost'] for r in off_peak_records])
        
        peak_avg_quality = np.mean([r['quality'] for r in peak_records])
        off_peak_avg_quality = np.mean([r['quality'] for r in off_peak_records])
        
        return {
            "peak_hours_analysis": {
                "average_cost": peak_avg_cost,
                "average_quality": peak_avg_quality,
                "efficiency": peak_avg_quality / peak_avg_cost if peak_avg_cost > 0 else 0,
                "sample_size": len(peak_records)
            },
            "off_peak_analysis": {
                "average_cost": off_peak_avg_cost,
                "average_quality": off_peak_avg_quality,
                "efficiency": off_peak_avg_quality / off_peak_avg_cost if off_peak_avg_cost > 0 else 0,
                "sample_size": len(off_peak_records)
            },
            "recommendations": {
                "cost_savings": peak_avg_cost - off_peak_avg_cost,
                "quality_difference": peak_avg_quality - off_peak_avg_quality,
                "optimal_timing": "off_peak" if off_peak_avg_cost < peak_avg_cost else "peak"
            }
        }