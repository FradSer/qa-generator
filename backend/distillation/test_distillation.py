"""
Test suite for Knowledge Distillation system
Comprehensive testing and validation of the distillation implementation
"""

import asyncio
import json
import logging
import pytest
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, List, Any
import tempfile
import os
from datetime import datetime

from .core import (
    GenerationRequest, TeacherExample, DistillationStrategy,
    KnowledgeDistillationOrchestrator, TeacherModel, StudentModel
)
from .providers import ProviderConfig, OpenAIProvider, CostOptimizer
from .integration import DistillationManager, DistillationConfig, APIIntegrationLayer
from .cost_optimizer import IntelligentCostOptimizer, CostBudget, ModelCostProfile
from .transfer import KnowledgeTransferEngine, PatternExtractor

logger = logging.getLogger(__name__)


class MockLLMProvider:
    """Mock LLM provider for testing"""
    
    def __init__(self, model_name: str, quality_score: float = 0.8):
        self.model_name = model_name
        self.quality_score = quality_score
        self.call_count = 0
    
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Mock generation"""
        self.call_count += 1
        
        return {
            "content": f"Generated content for: {prompt[:50]}...",
            "tokens_used": 100,
            "model": self.model_name,
            "confidence": self.quality_score,
            "finish_reason": "stop"
        }
    
    def get_cost_per_token(self) -> tuple:
        return (0.001, 0.002)
    
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "provider": "mock",
            "model": self.model_name,
            "pricing": self.get_cost_per_token(),
            "role_suitability": {"teacher": 0.9, "student": 0.7}
        }


class TestKnowledgeDistillationCore:
    """Test core distillation functionality"""
    
    @pytest.fixture
    def mock_teacher_provider(self):
        return MockLLMProvider("mock-teacher", 0.9)
    
    @pytest.fixture
    def mock_student_provider(self):
        return MockLLMProvider("mock-student", 0.7)
    
    @pytest.fixture
    def teacher_model(self, mock_teacher_provider):
        return TeacherModel(mock_teacher_provider, "teacher")
    
    @pytest.fixture
    def student_model(self, mock_student_provider):
        return StudentModel(mock_student_provider, "student")
    
    @pytest.fixture
    def orchestrator(self, teacher_model, student_model):
        return KnowledgeDistillationOrchestrator(teacher_model, student_model)
    
    @pytest.fixture
    def generation_request(self):
        return GenerationRequest(
            keywords=["AI", "machine learning"],
            data_type="qa",
            quantity=10,
            quality_threshold=0.8
        )
    
    @pytest.mark.asyncio
    async def test_teacher_seed_generation(self, teacher_model, generation_request):
        """Test teacher model seed data generation"""
        examples = await teacher_model.generate_seed_data(generation_request)
        
        assert len(examples) > 0
        assert len(examples) <= 5  # Should generate min(10//10, 50) = 1, but we expect at least 1
        
        for example in examples:
            assert isinstance(example, TeacherExample)
            assert example.output
            assert example.confidence > 0
            assert example.model == "teacher"
    
    @pytest.mark.asyncio
    async def test_student_learning(self, student_model):
        """Test student learning from teacher examples"""
        # Create mock teacher examples
        teacher_examples = [
            TeacherExample(
                input="What is AI?",
                output="AI is artificial intelligence...",
                confidence=0.9,
                tokens_used=50,
                model="teacher",
                timestamp=datetime.now(),
                context={"keywords": ["AI"]}
            )
        ]
        
        result = student_model.learn_from_teacher(teacher_examples)
        
        assert "patterns_learned" in result
        assert "examples_processed" in result
        assert result["examples_processed"] == 1
        assert student_model.learned_patterns  # Should have some learned patterns
    
    @pytest.mark.asyncio
    async def test_full_orchestration(self, orchestrator, generation_request):
        """Test full orchestration process"""
        response = await orchestrator.generate_dataset(generation_request)
        
        assert response.id
        assert response.data
        assert response.quality_score > 0
        assert response.cost >= 0
        assert response.generation_time > 0
        assert "teacher_examples" in response.metadata
        assert "student_generated" in response.metadata


class TestPatternExtraction:
    """Test pattern extraction functionality"""
    
    @pytest.fixture
    def pattern_extractor(self):
        return PatternExtractor()
    
    @pytest.fixture
    def sample_teacher_examples(self):
        return [
            TeacherExample(
                input="What is machine learning?",
                output="Machine learning is a subset of AI that...",
                confidence=0.9,
                tokens_used=50,
                model="teacher",
                timestamp=datetime.now(),
                context={"keywords": ["machine learning", "AI"]}
            ),
            TeacherExample(
                input="Define deep learning",
                output="Deep learning is a type of machine learning that...",
                confidence=0.85,
                tokens_used=45,
                model="teacher",
                timestamp=datetime.now(),
                context={"keywords": ["deep learning", "neural networks"]}
            )
        ]
    
    def test_pattern_extraction(self, pattern_extractor, sample_teacher_examples):
        """Test basic pattern extraction"""
        patterns = pattern_extractor.extract_patterns(sample_teacher_examples)
        
        assert len(patterns) > 0
        
        for pattern in patterns:
            assert pattern.pattern_id
            assert pattern.pattern_type in ["structure", "style", "content", "format"]
            assert pattern.confidence >= 0
            assert pattern.frequency > 0
    
    def test_structure_signature(self, pattern_extractor):
        """Test structure signature generation"""
        text = "# Title\n- Item 1\n- Item 2\nWhat is this?\nThis is text."
        signature = pattern_extractor._get_structure_signature(text)
        
        assert isinstance(signature, str)
        assert "HEADER" in signature
        assert "LIST" in signature
        assert "QUESTION" in signature
        assert "TEXT" in signature


class TestCostOptimization:
    """Test cost optimization functionality"""
    
    @pytest.fixture
    def cost_optimizer(self):
        return IntelligentCostOptimizer()
    
    @pytest.fixture
    def model_profiles(self):
        return [
            ModelCostProfile(
                provider="openai",
                model_name="gpt-4",
                input_cost_per_token=0.03,
                output_cost_per_token=0.06,
                quality_rating=0.95,
                speed_rating=30,
                reliability_rating=0.99
            ),
            ModelCostProfile(
                provider="openai",
                model_name="gpt-3.5-turbo",
                input_cost_per_token=0.001,
                output_cost_per_token=0.002,
                quality_rating=0.8,
                speed_rating=60,
                reliability_rating=0.95
            )
        ]
    
    @pytest.fixture
    def sample_budget(self):
        return CostBudget(
            total_budget=10.0,
            daily_budget=5.0,
            cost_per_item_limit=0.1
        )
    
    def test_model_profile_registration(self, cost_optimizer, model_profiles):
        """Test model profile registration"""
        for profile in model_profiles:
            cost_optimizer.register_model_profile(profile)
        
        assert len(cost_optimizer.model_profiles) == 2
        assert "openai_gpt-4" in cost_optimizer.model_profiles
        assert "openai_gpt-3.5-turbo" in cost_optimizer.model_profiles
    
    def test_cost_estimation(self, cost_optimizer, model_profiles):
        """Test cost estimation"""
        for profile in model_profiles:
            cost_optimizer.register_model_profile(profile)
        
        request = {
            "keywords": ["AI", "ML"],
            "data_type": "qa",
            "quantity": 10
        }
        
        estimate = cost_optimizer.estimate_generation_cost(request, "openai_gpt-4")
        
        assert estimate.estimated_cost > 0
        assert estimate.estimated_input_tokens > 0
        assert estimate.estimated_output_tokens > 0
        assert estimate.quality_expectation == 0.95
    
    def test_model_optimization(self, cost_optimizer, model_profiles, sample_budget):
        """Test model selection optimization"""
        for profile in model_profiles:
            cost_optimizer.register_model_profile(profile)
        
        request = {
            "keywords": ["AI"],
            "data_type": "qa",
            "quantity": 5
        }
        
        result = cost_optimizer.optimize_model_selection(request, sample_budget)
        
        assert "recommended_model" in result
        assert "estimated_cost" in result
        assert "estimated_quality" in result
        assert result["estimated_cost"] <= sample_budget.total_budget


class TestIntegration:
    """Test integration layer"""
    
    @pytest.fixture
    def distillation_config(self):
        return DistillationConfig(
            teacher_models=[{
                "name": "mock_teacher",
                "provider_type": "mock",
                "config": {
                    "api_key": "test",
                    "base_url": "http://test",
                    "model_name": "mock-teacher"
                }
            }],
            student_models=[{
                "name": "mock_student", 
                "provider_type": "mock",
                "config": {
                    "api_key": "test",
                    "base_url": "http://test",
                    "model_name": "mock-student"
                }
            }]
        )
    
    @patch('distillation.providers.ProviderFactory.create_provider')
    def test_distillation_manager_initialization(self, mock_factory, distillation_config):
        """Test distillation manager initialization"""
        mock_factory.return_value = MockLLMProvider("mock")
        
        manager = DistillationManager(distillation_config)
        
        assert len(manager.providers) == 2
        assert len(manager.orchestrators) >= 1
    
    def test_api_integration_layer(self):
        """Test API integration layer"""
        mock_manager = Mock()
        mock_manager.generate_dataset_with_distillation = AsyncMock()
        
        integration = APIIntegrationLayer(mock_manager)
        
        # Test request conversion
        api_request = {
            "keywords": ["test"],
            "data_type": "qa",
            "quantity": 5
        }
        
        generation_request = integration._convert_api_request(api_request)
        
        assert generation_request.keywords == ["test"]
        assert generation_request.data_type == "qa"
        assert generation_request.quantity == 5


class TestEndToEnd:
    """End-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_complete_workflow(self):
        """Test complete knowledge distillation workflow"""
        
        # Create mock configuration
        config = DistillationConfig(
            teacher_models=[{
                "name": "mock_teacher",
                "provider_type": "mock",
                "config": {
                    "api_key": "test",
                    "base_url": "http://test", 
                    "model_name": "mock-teacher"
                }
            }],
            student_models=[{
                "name": "mock_student",
                "provider_type": "mock", 
                "config": {
                    "api_key": "test",
                    "base_url": "http://test",
                    "model_name": "mock-student"
                }
            }]
        )
        
        # Mock provider factory
        with patch('distillation.providers.ProviderFactory.create_provider') as mock_factory:
            mock_factory.return_value = MockLLMProvider("mock")
            
            # Create manager and integration layer
            manager = DistillationManager(config)
            integration = APIIntegrationLayer(manager)
            
            # Test API request
            api_request = {
                "keywords": ["AI", "testing"],
                "data_type": "qa",
                "quantity": 3,
                "quality_threshold": 0.7
            }
            
            # Process request (this will use mocked providers)
            response = await integration.handle_generation_request(api_request)
            
            assert "error" not in response
            assert response["status"] == "completed"
            assert "data" in response
            assert "quality_score" in response


class PerformanceBenchmark:
    """Performance benchmarking utilities"""
    
    @staticmethod
    async def benchmark_generation_speed(orchestrator, quantities: List[int]) -> Dict[str, Any]:
        """Benchmark generation speed for different quantities"""
        results = {}
        
        for quantity in quantities:
            request = GenerationRequest(
                keywords=["benchmark", "test"],
                data_type="qa",
                quantity=quantity
            )
            
            start_time = datetime.now()
            response = await orchestrator.generate_dataset(request)
            end_time = datetime.now()
            
            duration = (end_time - start_time).total_seconds()
            
            results[quantity] = {
                "duration": duration,
                "items_per_second": quantity / duration if duration > 0 else 0,
                "quality_score": response.quality_score,
                "cost": response.cost
            }
        
        return results
    
    @staticmethod
    def benchmark_pattern_extraction(extractor, example_counts: List[int]) -> Dict[str, Any]:
        """Benchmark pattern extraction performance"""
        results = {}
        
        for count in example_counts:
            # Generate sample examples
            examples = []
            for i in range(count):
                example = TeacherExample(
                    input=f"Input {i}",
                    output=f"Output {i} with some pattern",
                    confidence=0.8,
                    tokens_used=50,
                    model="teacher",
                    timestamp=datetime.now(),
                    context={"keywords": ["benchmark"]}
                )
                examples.append(example)
            
            start_time = datetime.now()
            patterns = extractor.extract_patterns(examples)
            end_time = datetime.now()
            
            duration = (end_time - start_time).total_seconds()
            
            results[count] = {
                "duration": duration,
                "patterns_extracted": len(patterns),
                "examples_per_second": count / duration if duration > 0 else 0
            }
        
        return results


def create_test_config_file():
    """Create a test configuration file"""
    config = {
        "teacher_models": [{
            "name": "test_teacher",
            "provider_type": "openai",
            "config": {
                "api_key": "test-key",
                "base_url": "https://api.openai.com/v1",
                "model_name": "gpt-4",
                "max_tokens": 2000,
                "rate_limit_per_minute": 30
            }
        }],
        "student_models": [{
            "name": "test_student", 
            "provider_type": "openai",
            "config": {
                "api_key": "test-key",
                "base_url": "https://api.openai.com/v1",
                "model_name": "gpt-3.5-turbo",
                "max_tokens": 1000,
                "rate_limit_per_minute": 60
            }
        }],
        "strategy": "response_based",
        "quality_threshold": 0.8,
        "cost_optimization": True,
        "adaptive_learning": True,
        "cache_patterns": True
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(config, f, indent=2)
        return f.name


async def run_integration_demo():
    """Run a demo of the complete integration"""
    print("=== Knowledge Distillation Integration Demo ===\n")
    
    # Create test configuration
    config_path = create_test_config_file()
    
    try:
        print("1. Loading configuration...")
        from .integration import create_distillation_system
        
        # Mock the provider factory for demo
        with patch('distillation.providers.ProviderFactory.create_provider') as mock_factory:
            mock_factory.return_value = MockLLMProvider("demo-model")
            
            manager, integration = create_distillation_system(config_path)
            print(f"   ✓ Initialized with {len(manager.providers)} providers")
        
        print("\n2. Processing sample request...")
        api_request = {
            "keywords": ["artificial intelligence", "deep learning"],
            "data_type": "qa",
            "quantity": 5,
            "quality_threshold": 0.8,
            "strategy": "response_based"
        }
        
        response = await integration.handle_generation_request(api_request)
        print(f"   ✓ Generated {len(response.get('data', []))} items")
        print(f"   ✓ Quality score: {response.get('quality_score', 0):.2f}")
        print(f"   ✓ Cost: ${response.get('cost', 0):.4f}")
        
        print("\n3. Getting analytics...")
        analytics = integration.get_analytics()
        print(f"   ✓ Success rate: {analytics['success_rate']:.2%}")
        print(f"   ✓ Average quality: {analytics['average_quality']:.2f}")
        
        print("\n4. System status...")
        status = manager.get_system_status()
        print(f"   ✓ Providers: {status['providers']}")
        print(f"   ✓ Orchestrators: {status['orchestrators']}")
        print(f"   ✓ Cached patterns: {status['cached_patterns']}")
        
        await manager.cleanup()
        print("\n✓ Demo completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Demo failed: {e}")
    finally:
        # Clean up test config file
        try:
            os.unlink(config_path)
        except:
            pass


if __name__ == "__main__":
    # Run the demo
    asyncio.run(run_integration_demo())
    
    print("\n=== Running Unit Tests ===")
    print("To run tests, use: python -m pytest distillation/test_distillation.py -v")
    
    print("\n=== Performance Benchmarking ===")
    print("Benchmark results would be displayed here in a real implementation")