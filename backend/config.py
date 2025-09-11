"""
配置管理
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """应用配置"""
    
    # 基础配置
    APP_NAME: str = "AI微调数据集生成器"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    
    # 数据库配置
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/qa_generator"
    DATABASE_ECHO: bool = False
    
    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1小时
    
    # 知识蒸馏配置
    DISTILLATION_CONFIG_PATH: str = "config/distillation.json"
    
    # LLM API配置
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    
    # 成本控制
    DEFAULT_BUDGET_LIMIT: float = 100.0  # 美元
    MAX_GENERATION_SIZE: int = 10000
    
    # 安全配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # 文件存储
    UPLOAD_DIR: str = "uploads"
    EXPORT_DIR: str = "exports"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # 监控配置
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 8001
    
    # 任务队列
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 全局配置实例
settings = Settings()


def get_settings() -> Settings:
    """获取配置实例"""
    return settings


# 数据库配置
class DatabaseConfig:
    """数据库配置类"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    @property
    def url(self) -> str:
        return self.settings.DATABASE_URL
    
    @property
    def echo(self) -> bool:
        return self.settings.DATABASE_ECHO
    
    def get_async_url(self) -> str:
        """获取异步数据库URL"""
        return self.settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")


# Redis配置
class RedisConfig:
    """Redis配置类"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    @property
    def url(self) -> str:
        return self.settings.REDIS_URL
    
    @property
    def cache_ttl(self) -> int:
        return self.settings.REDIS_CACHE_TTL


# 知识蒸馏配置
class DistillationSettings:
    """知识蒸馏配置"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    def get_config_path(self) -> str:
        """获取蒸馏配置文件路径"""
        return self.settings.DISTILLATION_CONFIG_PATH
    
    def get_api_keys(self) -> dict:
        """获取API密钥"""
        return {
            "openai": self.settings.OPENAI_API_KEY,
            "anthropic": self.settings.ANTHROPIC_API_KEY,
            "google": self.settings.GOOGLE_API_KEY
        }
    
    def create_default_config(self) -> dict:
        """创建默认蒸馏配置"""
        api_keys = self.get_api_keys()
        
        config = {
            "teacher_models": [],
            "student_models": [],
            "strategy": "response_based",
            "quality_threshold": 0.8,
            "cost_optimization": True,
            "adaptive_learning": True,
            "cache_patterns": True,
            "max_teacher_examples": 50,
            "student_batch_size": 20,
            "validation_sample_ratio": 0.1
        }
        
        # 添加可用的教师模型
        if api_keys["openai"]:
            config["teacher_models"].append({
                "name": "gpt4_teacher",
                "provider_type": "openai",
                "config": {
                    "api_key": api_keys["openai"],
                    "base_url": "https://api.openai.com/v1",
                    "model_name": "gpt-4o",
                    "max_tokens": 2000,
                    "rate_limit_per_minute": 30
                }
            })
        
        if api_keys["anthropic"]:
            config["teacher_models"].append({
                "name": "claude_teacher",
                "provider_type": "anthropic",
                "config": {
                    "api_key": api_keys["anthropic"],
                    "base_url": "https://api.anthropic.com",
                    "model_name": "claude-3.5-sonnet",
                    "max_tokens": 4000,
                    "rate_limit_per_minute": 25
                }
            })
        
        # 添加学生模型
        if api_keys["openai"]:
            config["student_models"].append({
                "name": "gpt35_student",
                "provider_type": "openai",
                "config": {
                    "api_key": api_keys["openai"],
                    "base_url": "https://api.openai.com/v1",
                    "model_name": "gpt-3.5-turbo",
                    "max_tokens": 1000,
                    "rate_limit_per_minute": 60
                }
            })
        
        return config


# 导出配置实例
database_config = DatabaseConfig(settings)
redis_config = RedisConfig(settings)
distillation_settings = DistillationSettings(settings)