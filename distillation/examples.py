"""
Example implementations and usage patterns for Knowledge Distillation
Demonstrates various use cases and best practices
"""

import asyncio
import json
import logging
from typing import Dict, List, Any
from datetime import datetime
import os

from . import (
    create_distillation_system,
    DistillationConfig,
    GenerationRequest,
    DistillationStrategy,
    CostBudget,
    OptimizationStrategy,
    ModelCostProfile
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DistillationExamples:
    """Collection of example implementations"""
    
    def __init__(self):
        self.results_history = []
    
    async def basic_qa_generation_example(self):
        """Basic Q&A dataset generation using distillation"""
        
        print("\n=== Basic Q&A Generation Example ===")
        
        # Create configuration
        config = self._create_sample_config()
        
        # Initialize distillation system  
        manager, api_layer = create_distillation_system()
        manager.config = config  # Override with sample config
        
        try:
            # Define generation request
            request = {
                "keywords": ["artificial intelligence", "neural networks", "deep learning"],
                "data_type": "qa",
                "quantity": 20,
                "quality_threshold": 0.8,
                "strategy": "response_based"
            }
            
            print(f"Generating {request['quantity']} Q&A pairs...")
            
            # Process request
            response = await api_layer.handle_generation_request(request)
            
            # Display results
            if "error" not in response:
                print(f"✓ Generated {len(response['data'])} items")
                print(f"✓ Quality Score: {response['quality_score']:.2f}")
                print(f"✓ Total Cost: ${response['cost']:.4f}")
                print(f"✓ Generation Time: {response['generation_time']:.1f}s")
                
                # Show sample data
                print("\nSample Generated Data:")
                for i, item in enumerate(response['data'][:3]):
                    print(f"  {i+1}. {item['content'][:100]}...")
                
                self.results_history.append(response)
            else:
                print(f"✗ Generation failed: {response['error']}")
        
        finally:
            await manager.cleanup()
    
    async def multi_provider_comparison_example(self):
        """Compare different LLM providers for cost and quality"""
        
        print("\n=== Multi-Provider Comparison Example ===")
        
        # Test different provider configurations
        providers = [
            {"name": "gpt4", "model": "gpt-4o", "expected_quality": 0.95},
            {"name": "gpt3.5", "model": "gpt-3.5-turbo", "expected_quality": 0.8},
            {"name": "claude", "model": "claude-3.5-sonnet", "expected_quality": 0.9}
        ]
        
        comparison_results = []
        
        for provider in providers:
            print(f"\nTesting {provider['name']}...")
            
            # Create provider-specific config
            config = self._create_provider_specific_config(provider)
            manager, api_layer = create_distillation_system()
            manager.config = config
            
            try:
                request = {
                    "keywords": ["machine learning", "algorithms"],
                    "data_type": "classification", 
                    "quantity": 10,
                    "quality_threshold": 0.7
                }
                
                start_time = datetime.now()
                response = await api_layer.handle_generation_request(request)
                end_time = datetime.now()
                
                if "error" not in response:
                    result = {
                        "provider": provider['name'],
                        "quality": response['quality_score'],
                        "cost": response['cost'],
                        "time": (end_time - start_time).total_seconds(),
                        "efficiency": response['quality_score'] / max(response['cost'], 0.001)
                    }
                    comparison_results.append(result)
                    
                    print(f"  Quality: {result['quality']:.2f}")
                    print(f"  Cost: ${result['cost']:.4f}")
                    print(f"  Efficiency: {result['efficiency']:.1f}")
                
            except Exception as e:
                print(f"  ✗ Failed: {e}")
            finally:
                await manager.cleanup()
        
        # Display comparison
        if comparison_results:
            print("\n=== Provider Comparison Results ===")
            best_quality = max(comparison_results, key=lambda x: x['quality'])
            best_cost = min(comparison_results, key=lambda x: x['cost'])  
            best_efficiency = max(comparison_results, key=lambda x: x['efficiency'])
            
            print(f"Best Quality: {best_quality['provider']} ({best_quality['quality']:.2f})")
            print(f"Lowest Cost: {best_cost['provider']} (${best_cost['cost']:.4f})")
            print(f"Best Efficiency: {best_efficiency['provider']} ({best_efficiency['efficiency']:.1f})")
    
    async def cost_optimization_example(self):
        """Demonstrate advanced cost optimization techniques"""
        
        print("\n=== Cost Optimization Example ===")
        
        # Set up budget constraints
        budget = CostBudget(
            total_budget=5.00,
            daily_budget=2.00,
            cost_per_item_limit=0.05,
            quality_cost_ratio_min=20.0
        )
        
        print(f"Budget: ${budget.total_budget}")
        print(f"Daily limit: ${budget.daily_budget}")
        print(f"Max cost per item: ${budget.cost_per_item_limit}")
        
        # Create cost-optimized configuration
        config = self._create_cost_optimized_config()
        manager, api_layer = create_distillation_system()
        manager.config = config
        
        try:
            # Test different optimization strategies
            strategies = [
                OptimizationStrategy.COST_FIRST,
                OptimizationStrategy.QUALITY_FIRST, 
                OptimizationStrategy.BALANCED
            ]
            
            for strategy in strategies:
                print(f"\nTesting {strategy.value} strategy...")
                
                request = {
                    "keywords": ["data science", "statistics"],
                    "data_type": "generation",
                    "quantity": 15,
                    "optimization_strategy": strategy.value,
                    "budget": budget.__dict__
                }
                
                response = await api_layer.handle_generation_request(request)
                
                if "error" not in response:
                    utilization = response['cost'] / budget.total_budget * 100
                    print(f"  Quality: {response['quality_score']:.2f}")
                    print(f"  Cost: ${response['cost']:.4f}")
                    print(f"  Budget utilization: {utilization:.1f}%")
                    
                    if response['cost'] > budget.total_budget:
                        print(f"  ⚠ Exceeded budget!")
        
        finally:
            await manager.cleanup()
    
    async def adaptive_learning_example(self):
        """Demonstrate adaptive learning and pattern caching"""
        
        print("\n=== Adaptive Learning Example ===")
        
        config = self._create_adaptive_config()
        manager, api_layer = create_distillation_system()
        manager.config = config
        
        try:
            # First generation - cold start
            print("First generation (cold start)...")
            
            request1 = {
                "keywords": ["blockchain", "cryptocurrency"],
                "data_type": "qa", 
                "quantity": 8,
                "quality_threshold": 0.8
            }
            
            start_time = datetime.now()
            response1 = await api_layer.handle_generation_request(request1)
            time1 = (datetime.now() - start_time).total_seconds()
            
            print(f"  Time: {time1:.1f}s")
            print(f"  Quality: {response1['quality_score']:.2f}")
            print(f"  Cached patterns: {response1.get('metadata', {}).get('patterns_cached', 0)}")
            
            # Second generation - should use cached patterns
            print("\nSecond generation (using cached patterns)...")
            
            request2 = {
                "keywords": ["blockchain", "smart contracts"],  # Similar keywords
                "data_type": "qa",
                "quantity": 8, 
                "quality_threshold": 0.8
            }
            
            start_time = datetime.now() 
            response2 = await api_layer.handle_generation_request(request2)
            time2 = (datetime.now() - start_time).total_seconds()
            
            print(f"  Time: {time2:.1f}s")
            print(f"  Quality: {response2['quality_score']:.2f}")
            print(f"  Used cached patterns: {response2.get('metadata', {}).get('patterns_reused', 0)}")
            
            # Show improvement
            if time2 < time1:
                improvement = (time1 - time2) / time1 * 100
                print(f"\n✓ Speed improvement: {improvement:.1f}%")
        
        finally:
            await manager.cleanup()
    
    async def bulk_generation_example(self):
        """Demonstrate large-scale dataset generation"""
        
        print("\n=== Bulk Generation Example ===")
        
        config = self._create_bulk_generation_config()
        manager, api_layer = create_distillation_system() 
        manager.config = config
        
        try:
            # Large dataset request
            request = {
                "keywords": ["natural language processing", "transformers", "BERT", "GPT"],
                "data_type": "qa",
                "quantity": 100,  # Large quantity
                "quality_threshold": 0.75,
                "batch_processing": True,
                "progress_callback": True
            }
            
            print(f"Generating {request['quantity']} items in batches...")
            
            start_time = datetime.now()
            response = await api_layer.handle_generation_request(request)
            end_time = datetime.now()
            
            if "error" not in response:
                total_time = (end_time - start_time).total_seconds()
                items_per_second = request['quantity'] / total_time
                
                print(f"✓ Generated {len(response['data'])} items")
                print(f"✓ Total time: {total_time:.1f}s")
                print(f"✓ Rate: {items_per_second:.1f} items/second")
                print(f"✓ Average quality: {response['quality_score']:.2f}")
                print(f"✓ Total cost: ${response['cost']:.2f}")
                print(f"✓ Cost per item: ${response['cost']/len(response['data']):.4f}")
                
                # Quality distribution
                qualities = [item.get('quality', 0) for item in response['data'] if 'quality' in item]
                if qualities:
                    print(f"✓ Quality range: {min(qualities):.2f} - {max(qualities):.2f}")
        
        finally:
            await manager.cleanup()
    
    def _create_sample_config(self) -> DistillationConfig:
        """Create a sample configuration for testing"""
        return DistillationConfig(
            teacher_models=[{
                "name": "sample_teacher",
                "provider_type": "openai", 
                "config": {
                    "api_key": os.getenv("OPENAI_API_KEY", "test-key"),
                    "base_url": "https://api.openai.com/v1",
                    "model_name": "gpt-4o",
                    "max_tokens": 2000,
                    "rate_limit_per_minute": 30
                }
            }],
            student_models=[{
                "name": "sample_student",
                "provider_type": "openai",
                "config": {
                    "api_key": os.getenv("OPENAI_API_KEY", "test-key"),
                    "base_url": "https://api.openai.com/v1", 
                    "model_name": "gpt-3.5-turbo",
                    "max_tokens": 1000,
                    "rate_limit_per_minute": 60
                }
            }],
            strategy=DistillationStrategy.RESPONSE_BASED,
            quality_threshold=0.8,
            cost_optimization=True,
            adaptive_learning=False,
            cache_patterns=True
        )
    
    def _create_provider_specific_config(self, provider: Dict[str, Any]) -> DistillationConfig:
        """Create config for specific provider"""
        # This would create provider-specific configurations
        # For demo purposes, using sample config
        return self._create_sample_config()
    
    def _create_cost_optimized_config(self) -> DistillationConfig:
        """Create cost-optimized configuration"""
        config = self._create_sample_config()
        config.cost_optimization = True
        config.student_batch_size = 50  # Larger batches for efficiency
        config.max_teacher_examples = 20  # Limit teacher usage
        return config
    
    def _create_adaptive_config(self) -> DistillationConfig:
        """Create adaptive learning configuration"""
        config = self._create_sample_config() 
        config.adaptive_learning = True
        config.cache_patterns = True
        return config
    
    def _create_bulk_generation_config(self) -> DistillationConfig:
        """Create configuration optimized for bulk generation"""
        config = self._create_sample_config()
        config.student_batch_size = 25
        config.max_teacher_examples = 30
        config.validation_sample_ratio = 0.05  # Lower validation for speed
        return config
    
    async def run_all_examples(self):
        """Run all examples in sequence"""
        print("🚀 Running Knowledge Distillation Examples")
        print("=" * 50)
        
        examples = [
            self.basic_qa_generation_example,
            self.multi_provider_comparison_example, 
            self.cost_optimization_example,
            self.adaptive_learning_example,
            self.bulk_generation_example
        ]
        
        for i, example in enumerate(examples, 1):
            try:
                print(f"\n[{i}/{len(examples)}] {example.__name__}")
                await example()
            except Exception as e:
                print(f"✗ Example failed: {e}")
                logger.exception(f"Example {example.__name__} failed")
        
        print("\n" + "=" * 50)
        print("🎉 All examples completed!")
        
        # Summary
        if self.results_history:
            total_items = sum(len(r.get('data', [])) for r in self.results_history)
            total_cost = sum(r.get('cost', 0) for r in self.results_history)
            avg_quality = sum(r.get('quality_score', 0) for r in self.results_history) / len(self.results_history)
            
            print(f"\nSummary:")
            print(f"  Total items generated: {total_items}")
            print(f"  Total cost: ${total_cost:.2f}")
            print(f"  Average quality: {avg_quality:.2f}")


class InteractiveDemo:
    """Interactive demonstration of distillation features"""
    
    def __init__(self):
        self.manager = None
        self.api_layer = None
    
    async def start_interactive_session(self):
        """Start interactive session"""
        print("🎯 Interactive Knowledge Distillation Demo")
        print("=" * 45)
        
        # Initialize system
        print("Initializing distillation system...")
        config = DistillationConfig(
            teacher_models=[{
                "name": "interactive_teacher",
                "provider_type": "openai",
                "config": {
                    "api_key": os.getenv("OPENAI_API_KEY", "demo-key"),
                    "base_url": "https://api.openai.com/v1",
                    "model_name": "gpt-4o",
                    "max_tokens": 2000
                }
            }],
            student_models=[{
                "name": "interactive_student", 
                "provider_type": "openai",
                "config": {
                    "api_key": os.getenv("OPENAI_API_KEY", "demo-key"),
                    "base_url": "https://api.openai.com/v1",
                    "model_name": "gpt-3.5-turbo", 
                    "max_tokens": 1000
                }
            }]
        )
        
        self.manager, self.api_layer = create_distillation_system()
        self.manager.config = config
        
        try:
            await self._interactive_menu()
        finally:
            if self.manager:
                await self.manager.cleanup()
    
    async def _interactive_menu(self):
        """Show interactive menu"""
        while True:
            print("\n📋 Available Actions:")
            print("1. Generate Q&A dataset")
            print("2. Generate classification data")
            print("3. Cost estimation")
            print("4. System status")
            print("5. Analytics")
            print("0. Exit")
            
            try:
                choice = input("\nEnter choice (0-5): ").strip()
                
                if choice == "0":
                    break
                elif choice == "1":
                    await self._generate_qa_interactive()
                elif choice == "2":
                    await self._generate_classification_interactive()
                elif choice == "3":
                    await self._cost_estimation_interactive()
                elif choice == "4":
                    await self._system_status()
                elif choice == "5":
                    await self._analytics()
                else:
                    print("❌ Invalid choice")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    async def _generate_qa_interactive(self):
        """Interactive Q&A generation"""
        print("\n🤖 Q&A Dataset Generation")
        
        keywords = input("Enter keywords (comma-separated): ").split(",")
        keywords = [k.strip() for k in keywords if k.strip()]
        
        if not keywords:
            print("❌ No keywords provided")
            return
        
        try:
            quantity = int(input("Enter quantity (1-50): ") or "10")
            quantity = min(max(quantity, 1), 50)
        except ValueError:
            quantity = 10
        
        request = {
            "keywords": keywords,
            "data_type": "qa", 
            "quantity": quantity,
            "quality_threshold": 0.8
        }
        
        print(f"\n⏳ Generating {quantity} Q&A pairs for keywords: {', '.join(keywords)}")
        
        try:
            response = await self.api_layer.handle_generation_request(request)
            
            if "error" not in response:
                print(f"✅ Generated {len(response['data'])} items")
                print(f"📊 Quality: {response['quality_score']:.2f}")
                print(f"💰 Cost: ${response['cost']:.4f}")
                
                # Show samples
                show_samples = input("\nShow samples? (y/n): ").lower().startswith('y')
                if show_samples and response['data']:
                    for i, item in enumerate(response['data'][:3], 1):
                        print(f"\n{i}. {item['content'][:200]}...")
            else:
                print(f"❌ Failed: {response['error']}")
                
        except Exception as e:
            print(f"❌ Generation failed: {e}")
    
    async def _generate_classification_interactive(self):
        """Interactive classification data generation"""
        print("\n📝 Classification Dataset Generation")
        
        categories = input("Enter categories (comma-separated): ").split(",")
        categories = [c.strip() for c in categories if c.strip()]
        
        if len(categories) < 2:
            print("❌ Need at least 2 categories")
            return
        
        try:
            quantity = int(input("Enter quantity per category (1-20): ") or "5")
            quantity = min(max(quantity, 1), 20)
        except ValueError:
            quantity = 5
        
        total_quantity = len(categories) * quantity
        
        request = {
            "keywords": categories,
            "data_type": "classification",
            "quantity": total_quantity,
            "quality_threshold": 0.8,
            "categories": categories
        }
        
        print(f"\n⏳ Generating {total_quantity} classification examples for {len(categories)} categories")
        
        try:
            response = await self.api_layer.handle_generation_request(request)
            
            if "error" not in response:
                print(f"✅ Generated {len(response['data'])} items")
                print(f"📊 Quality: {response['quality_score']:.2f}")
                print(f"💰 Cost: ${response['cost']:.4f}")
            else:
                print(f"❌ Failed: {response['error']}")
                
        except Exception as e:
            print(f"❌ Generation failed: {e}")
    
    async def _cost_estimation_interactive(self):
        """Interactive cost estimation"""
        print("\n💰 Cost Estimation")
        
        data_types = ["qa", "classification", "generation", "translation"]
        print(f"Data types: {', '.join(data_types)}")
        data_type = input("Enter data type: ").strip().lower()
        if data_type not in data_types:
            data_type = "qa"
        
        try:
            quantity = int(input("Enter quantity: ") or "10")
        except ValueError:
            quantity = 10
        
        # Mock cost estimation (would use real optimizer in practice)
        base_cost_per_item = {"qa": 0.02, "classification": 0.01, "generation": 0.05, "translation": 0.03}
        estimated_cost = quantity * base_cost_per_item.get(data_type, 0.02)
        
        print(f"\n📊 Cost Estimation:")
        print(f"   Data type: {data_type}")
        print(f"   Quantity: {quantity}")
        print(f"   Estimated cost: ${estimated_cost:.2f}")
        print(f"   Cost per item: ${estimated_cost/quantity:.4f}")
    
    async def _system_status(self):
        """Show system status"""
        print("\n🔍 System Status")
        
        try:
            status = self.manager.get_system_status()
            
            print(f"   Providers: {status.get('providers', 0)}")
            print(f"   Orchestrators: {status.get('orchestrators', 0)}")
            print(f"   Cached patterns: {status.get('cached_patterns', 0)}")
            print(f"   Cost optimization: {'✅' if status.get('cost_optimization_enabled') else '❌'}")
            print(f"   Adaptive learning: {'✅' if status.get('adaptive_learning_enabled') else '❌'}")
            
        except Exception as e:
            print(f"❌ Failed to get status: {e}")
    
    async def _analytics(self):
        """Show analytics"""
        print("\n📈 Analytics")
        
        try:
            analytics = self.api_layer.get_analytics()
            
            print(f"   Total requests: {analytics.get('total_requests', 0)}")
            print(f"   Success rate: {analytics.get('success_rate', 0):.1%}")
            print(f"   Average quality: {analytics.get('average_quality', 0):.2f}")
            print(f"   Total cost: ${analytics.get('total_cost', 0):.2f}")
            print(f"   Data generated: {analytics.get('data_generated', 0)} items")
            
        except Exception as e:
            print(f"❌ Failed to get analytics: {e}")


async def main():
    """Main example runner"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "interactive":
        # Run interactive demo
        demo = InteractiveDemo()
        await demo.start_interactive_session()
    else:
        # Run all examples
        examples = DistillationExamples()
        await examples.run_all_examples()


if __name__ == "__main__":
    asyncio.run(main())