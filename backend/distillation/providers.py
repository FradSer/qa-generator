"""
LLM Provider Implementations for Knowledge Distillation
Supports OpenAI, Anthropic, Google, and other major providers
"""

import asyncio
import json
import logging
from typing import Dict, Any, Tuple, Optional
import aiohttp
import time
from dataclasses import dataclass
from abc import ABC, abstractmethod

from .core import LLMProvider

logger = logging.getLogger(__name__)


@dataclass
class ProviderConfig:
    """Configuration for LLM providers"""
    api_key: str
    base_url: str
    model_name: str
    max_tokens: int = 4000
    temperature: float = 0.7
    timeout: int = 30
    rate_limit_per_minute: int = 60


class OpenAIProvider(LLMProvider):
    """OpenAI API provider for teacher and student models"""
    
    # Cost per 1K tokens (input, output) - 2024 pricing
    PRICING = {
        "gpt-4o": (0.005, 0.015),
        "gpt-4": (0.03, 0.06),
        "gpt-3.5-turbo": (0.001, 0.002),
    }
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = RateLimiter(config.rate_limit_per_minute)
    
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using OpenAI API"""
        await self.rate_limiter.wait_if_needed()
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.config.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "temperature": kwargs.get("temperature", self.config.temperature),
        }
        
        try:
            async with self.session.post(
                f"{self.config.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error: {response.status}, {error_text}")
                
                data = await response.json()
                
                return {
                    "content": data["choices"][0]["message"]["content"],
                    "tokens_used": data["usage"]["total_tokens"],
                    "model": self.config.model_name,
                    "confidence": self._calculate_confidence(data),
                    "finish_reason": data["choices"][0]["finish_reason"]
                }
                
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise
    
    def get_cost_per_token(self) -> Tuple[float, float]:
        """Get cost per token for input and output"""
        return self.PRICING.get(self.config.model_name, (0.01, 0.02))
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "provider": "openai",
            "model": self.config.model_name,
            "max_tokens": self.config.max_tokens,
            "pricing": self.get_cost_per_token(),
            "role_suitability": self._get_role_suitability()
        }
    
    def _calculate_confidence(self, response_data: Dict[str, Any]) -> float:
        """Calculate confidence based on response characteristics"""
        # Simple heuristic - can be improved
        finish_reason = response_data["choices"][0]["finish_reason"]
        if finish_reason == "stop":
            return 0.9
        elif finish_reason == "length":
            return 0.7
        else:
            return 0.5
    
    def _get_role_suitability(self) -> Dict[str, float]:
        """Get model suitability for teacher/student roles"""
        if "gpt-4" in self.config.model_name:
            return {"teacher": 0.95, "student": 0.6}
        elif "gpt-3.5" in self.config.model_name:
            return {"teacher": 0.7, "student": 0.9}
        else:
            return {"teacher": 0.8, "student": 0.8}


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider"""
    
    PRICING = {
        "claude-3.5-sonnet": (0.003, 0.015),
        "claude-3-opus": (0.015, 0.075),
        "claude-3-haiku": (0.00025, 0.00125),
    }
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = RateLimiter(config.rate_limit_per_minute)
    
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using Anthropic API"""
        await self.rate_limiter.wait_if_needed()
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        headers = {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        payload = {
            "model": self.config.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "temperature": kwargs.get("temperature", self.config.temperature),
        }
        
        try:
            async with self.session.post(
                f"{self.config.base_url}/messages",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Anthropic API error: {response.status}, {error_text}")
                
                data = await response.json()
                
                return {
                    "content": data["content"][0]["text"],
                    "tokens_used": data["usage"]["input_tokens"] + data["usage"]["output_tokens"],
                    "model": self.config.model_name,
                    "confidence": 0.9,  # Claude typically provides high-quality responses
                    "stop_reason": data["stop_reason"]
                }
                
        except Exception as e:
            logger.error(f"Anthropic generation failed: {e}")
            raise
    
    def get_cost_per_token(self) -> Tuple[float, float]:
        return self.PRICING.get(self.config.model_name, (0.01, 0.03))
    
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "provider": "anthropic",
            "model": self.config.model_name,
            "max_tokens": self.config.max_tokens,
            "pricing": self.get_cost_per_token(),
            "role_suitability": self._get_role_suitability()
        }
    
    def _get_role_suitability(self) -> Dict[str, float]:
        if "opus" in self.config.model_name:
            return {"teacher": 1.0, "student": 0.5}
        elif "sonnet" in self.config.model_name:
            return {"teacher": 0.9, "student": 0.7}
        elif "haiku" in self.config.model_name:
            return {"teacher": 0.6, "student": 0.95}
        else:
            return {"teacher": 0.8, "student": 0.8}


class GoogleProvider(LLMProvider):
    """Google Gemini API provider"""
    
    PRICING = {
        "gemini-pro": (0.0005, 0.0015),
        "gemini-ultra": (0.01, 0.03),
    }
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = RateLimiter(config.rate_limit_per_minute)
    
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using Google Gemini API"""
        await self.rate_limiter.wait_if_needed()
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        url = f"{self.config.base_url}/v1/models/{self.config.model_name}:generateContent"
        
        headers = {
            "Content-Type": "application/json",
        }
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": kwargs.get("max_tokens", self.config.max_tokens),
                "temperature": kwargs.get("temperature", self.config.temperature),
            }
        }
        
        try:
            async with self.session.post(
                f"{url}?key={self.config.api_key}",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Google API error: {response.status}, {error_text}")
                
                data = await response.json()
                
                if "candidates" not in data or not data["candidates"]:
                    raise Exception("No candidates in Google API response")
                
                candidate = data["candidates"][0]
                content = candidate["content"]["parts"][0]["text"]
                
                return {
                    "content": content,
                    "tokens_used": data.get("usageMetadata", {}).get("totalTokenCount", 0),
                    "model": self.config.model_name,
                    "confidence": self._calculate_confidence(candidate),
                    "finish_reason": candidate.get("finishReason", "unknown")
                }
                
        except Exception as e:
            logger.error(f"Google generation failed: {e}")
            raise
    
    def get_cost_per_token(self) -> Tuple[float, float]:
        return self.PRICING.get(self.config.model_name, (0.001, 0.003))
    
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "provider": "google",
            "model": self.config.model_name,
            "max_tokens": self.config.max_tokens,
            "pricing": self.get_cost_per_token(),
            "role_suitability": self._get_role_suitability()
        }
    
    def _calculate_confidence(self, candidate: Dict[str, Any]) -> float:
        finish_reason = candidate.get("finishReason", "")
        safety_ratings = candidate.get("safetyRatings", [])
        
        if finish_reason == "STOP":
            return 0.85
        elif finish_reason == "MAX_TOKENS":
            return 0.7
        else:
            return 0.6
    
    def _get_role_suitability(self) -> Dict[str, float]:
        if "ultra" in self.config.model_name:
            return {"teacher": 0.9, "student": 0.6}
        else:
            return {"teacher": 0.75, "student": 0.85}


class LocalLlamaProvider(LLMProvider):
    """Local Llama model provider via Ollama or similar"""
    
    PRICING = {
        "llama2": (0.0, 0.0),  # Free for local models
        "llama3": (0.0, 0.0),
        "mistral": (0.0, 0.0),
    }
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = RateLimiter(config.rate_limit_per_minute)
    
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using local Llama model"""
        await self.rate_limiter.wait_if_needed()
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        payload = {
            "model": self.config.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", self.config.temperature),
                "num_predict": kwargs.get("max_tokens", self.config.max_tokens),
            }
        }
        
        try:
            async with self.session.post(
                f"{self.config.base_url}/api/generate",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Ollama API error: {response.status}, {error_text}")
                
                data = await response.json()
                
                return {
                    "content": data["response"],
                    "tokens_used": data.get("eval_count", 0) + data.get("prompt_eval_count", 0),
                    "model": self.config.model_name,
                    "confidence": 0.7,  # Local models - moderate confidence
                    "done": data.get("done", True)
                }
                
        except Exception as e:
            logger.error(f"Local model generation failed: {e}")
            raise
    
    def get_cost_per_token(self) -> Tuple[float, float]:
        return (0.0, 0.0)  # Local models are free
    
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "provider": "local_llama",
            "model": self.config.model_name,
            "max_tokens": self.config.max_tokens,
            "pricing": self.get_cost_per_token(),
            "role_suitability": {"teacher": 0.6, "student": 0.9}  # Great for students due to cost
        }


class RateLimiter:
    """Simple rate limiter for API calls"""
    
    def __init__(self, requests_per_minute: int):
        self.requests_per_minute = requests_per_minute
        self.request_times: list = []
    
    async def wait_if_needed(self):
        """Wait if rate limit would be exceeded"""
        now = time.time()
        
        # Remove requests older than 1 minute
        cutoff = now - 60
        self.request_times = [t for t in self.request_times if t > cutoff]
        
        # If we're at the limit, wait
        if len(self.request_times) >= self.requests_per_minute:
            wait_time = 60 - (now - self.request_times[0])
            if wait_time > 0:
                await asyncio.sleep(wait_time)
                # Clean up old requests again after waiting
                now = time.time()
                cutoff = now - 60
                self.request_times = [t for t in self.request_times if t > cutoff]
        
        self.request_times.append(now)


class ProviderFactory:
    """Factory for creating LLM providers"""
    
    PROVIDER_MAP = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "google": GoogleProvider,
        "local": LocalLlamaProvider,
    }
    
    @classmethod
    def create_provider(cls, provider_type: str, config: ProviderConfig) -> LLMProvider:
        """Create provider instance"""
        if provider_type not in cls.PROVIDER_MAP:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        return cls.PROVIDER_MAP[provider_type](config)
    
    @classmethod
    def get_optimal_teacher_student_pair(cls, available_configs: Dict[str, ProviderConfig]) -> Tuple[str, str]:
        """Get optimal teacher-student provider pair based on cost and capability"""
        
        # Create all providers to check suitability
        providers = {}
        for name, config in available_configs.items():
            provider_type = name.split("_")[0]  # e.g., "openai_gpt4" -> "openai"
            if provider_type in cls.PROVIDER_MAP:
                providers[name] = cls.create_provider(provider_type, config)
        
        # Find best teacher (high capability)
        best_teacher = None
        best_teacher_score = 0
        
        # Find best student (cost-efficient)
        best_student = None
        best_student_score = 0
        
        for name, provider in providers.items():
            info = provider.get_model_info()
            teacher_score = info["role_suitability"]["teacher"]
            student_score = info["role_suitability"]["student"]
            
            # Factor in cost (lower cost is better for students)
            cost_factor = 1.0 / (info["pricing"][1] + 0.001)  # Avoid division by zero
            
            if teacher_score > best_teacher_score:
                best_teacher = name
                best_teacher_score = teacher_score
            
            # For students, balance capability and cost
            adjusted_student_score = student_score * (cost_factor ** 0.3)
            if adjusted_student_score > best_student_score:
                best_student = name
                best_student_score = adjusted_student_score
        
        return best_teacher or list(providers.keys())[0], best_student or list(providers.keys())[0]


class CostOptimizer:
    """Optimizes costs across different providers"""
    
    def __init__(self, providers: Dict[str, LLMProvider]):
        self.providers = providers
        self.usage_stats: Dict[str, Dict[str, float]] = {}
    
    def get_cheapest_provider_for_task(self, task_complexity: float = 0.5) -> str:
        """Get the cheapest provider suitable for the task complexity"""
        suitable_providers = []
        
        for name, provider in self.providers.items():
            info = provider.get_model_info()
            capability = max(info["role_suitability"].values())
            
            if capability >= task_complexity:
                cost_per_token = sum(info["pricing"]) / 2  # Average cost
                suitable_providers.append((name, cost_per_token))
        
        if not suitable_providers:
            # Fallback to any provider
            return list(self.providers.keys())[0]
        
        # Return cheapest suitable provider
        suitable_providers.sort(key=lambda x: x[1])
        return suitable_providers[0][0]
    
    def estimate_cost(self, provider_name: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost for a generation task"""
        if provider_name not in self.providers:
            return 0.0
        
        input_cost, output_cost = self.providers[provider_name].get_cost_per_token()
        return (input_tokens * input_cost / 1000) + (output_tokens * output_cost / 1000)
    
    def track_usage(self, provider_name: str, tokens_used: int, cost: float):
        """Track usage statistics"""
        if provider_name not in self.usage_stats:
            self.usage_stats[provider_name] = {"tokens": 0, "cost": 0.0, "requests": 0}
        
        self.usage_stats[provider_name]["tokens"] += tokens_used
        self.usage_stats[provider_name]["cost"] += cost
        self.usage_stats[provider_name]["requests"] += 1
    
    def get_usage_report(self) -> Dict[str, Any]:
        """Get detailed usage report"""
        total_cost = sum(stats["cost"] for stats in self.usage_stats.values())
        total_tokens = sum(stats["tokens"] for stats in self.usage_stats.values())
        
        return {
            "total_cost": total_cost,
            "total_tokens": total_tokens,
            "by_provider": self.usage_stats,
            "average_cost_per_token": total_cost / total_tokens if total_tokens > 0 else 0
        }