"""
Knowledge Transfer Mechanisms for LLM Distillation
Implements advanced techniques for transferring knowledge from teacher to student models
"""

import asyncio
import json
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import re
from datetime import datetime
import hashlib

from .core import TeacherExample, GenerationRequest

logger = logging.getLogger(__name__)


@dataclass
class KnowledgePattern:
    """Represents a learned pattern from teacher examples"""
    pattern_id: str
    pattern_type: str  # "structure", "style", "content", "format"
    keywords: List[str]
    template: str
    examples: List[str]
    confidence: float
    frequency: int = 0
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class TransferMetrics:
    """Metrics for knowledge transfer effectiveness"""
    patterns_extracted: int
    transfer_accuracy: float
    student_improvement: float
    cost_reduction: float
    time_to_learn: float


class PatternExtractor:
    """Extracts reusable patterns from teacher examples"""
    
    def __init__(self):
        self.patterns: Dict[str, KnowledgePattern] = {}
        self.pattern_cache: Dict[str, List[str]] = {}
    
    def extract_patterns(self, teacher_examples: List[TeacherExample]) -> List[KnowledgePattern]:
        """Extract patterns from teacher examples"""
        logger.info(f"Extracting patterns from {len(teacher_examples)} examples")
        
        patterns = []
        
        # Extract different types of patterns
        patterns.extend(self._extract_structural_patterns(teacher_examples))
        patterns.extend(self._extract_style_patterns(teacher_examples))
        patterns.extend(self._extract_content_patterns(teacher_examples))
        patterns.extend(self._extract_format_patterns(teacher_examples))
        
        # Store patterns for reuse
        for pattern in patterns:
            self.patterns[pattern.pattern_id] = pattern
        
        logger.info(f"Extracted {len(patterns)} patterns")
        return patterns
    
    def _extract_structural_patterns(self, examples: List[TeacherExample]) -> List[KnowledgePattern]:
        """Extract structural patterns (how responses are organized)"""
        patterns = []
        structure_groups = defaultdict(list)
        
        for example in examples:
            # Analyze structure based on common markers
            structure_key = self._get_structure_signature(example.output)
            structure_groups[structure_key].append(example)
        
        # Create patterns for common structures
        for structure_key, group in structure_groups.items():
            if len(group) >= 2:  # Pattern needs at least 2 examples
                pattern_id = f"struct_{hashlib.md5(structure_key.encode()).hexdigest()[:8]}"
                
                template = self._create_structure_template(group)
                keywords = self._extract_common_keywords(group)
                
                pattern = KnowledgePattern(
                    pattern_id=pattern_id,
                    pattern_type="structure",
                    keywords=keywords,
                    template=template,
                    examples=[ex.output for ex in group[:3]],
                    confidence=min(1.0, len(group) / 10),
                    frequency=len(group)
                )
                patterns.append(pattern)
        
        return patterns
    
    def _extract_style_patterns(self, examples: List[TeacherExample]) -> List[KnowledgePattern]:
        """Extract stylistic patterns (tone, formality, etc.)"""
        patterns = []
        style_features = defaultdict(list)
        
        for example in examples:
            # Analyze style features
            features = {
                "sentence_length": np.mean([len(s.split()) for s in example.output.split('.')]),
                "formality": self._calculate_formality(example.output),
                "technical_terms": len(re.findall(r'\b[A-Z][a-z]*(?:[A-Z][a-z]*)*\b', example.output)),
                "question_ratio": example.output.count('?') / max(1, example.output.count('.')),
            }
            
            style_key = self._classify_style(features)
            style_features[style_key].append((example, features))
        
        # Create style patterns
        for style_key, group in style_features.items():
            if len(group) >= 3:
                examples_in_group = [item[0] for item in group]
                pattern_id = f"style_{style_key}"
                
                pattern = KnowledgePattern(
                    pattern_id=pattern_id,
                    pattern_type="style",
                    keywords=self._extract_common_keywords(examples_in_group),
                    template=self._create_style_template(group),
                    examples=[ex.output for ex in examples_in_group[:3]],
                    confidence=min(1.0, len(group) / 15),
                    frequency=len(group)
                )
                patterns.append(pattern)
        
        return patterns
    
    def _extract_content_patterns(self, examples: List[TeacherExample]) -> List[KnowledgePattern]:
        """Extract content-specific patterns"""
        patterns = []
        content_groups = defaultdict(list)
        
        for example in examples:
            # Group by topic/domain
            keywords = example.context.get("keywords", [])
            if keywords:
                topic_key = "_".join(sorted(keywords))
                content_groups[topic_key].append(example)
        
        # Create content patterns
        for topic_key, group in content_groups.items():
            if len(group) >= 2:
                pattern_id = f"content_{hashlib.md5(topic_key.encode()).hexdigest()[:8]}"
                
                pattern = KnowledgePattern(
                    pattern_id=pattern_id,
                    pattern_type="content",
                    keywords=topic_key.split("_"),
                    template=self._create_content_template(group),
                    examples=[ex.output for ex in group[:3]],
                    confidence=min(1.0, len(group) / 8),
                    frequency=len(group)
                )
                patterns.append(pattern)
        
        return patterns
    
    def _extract_format_patterns(self, examples: List[TeacherExample]) -> List[KnowledgePattern]:
        """Extract formatting patterns (JSON, lists, etc.)"""
        patterns = []
        format_groups = defaultdict(list)
        
        for example in examples:
            format_type = self._detect_format_type(example.output)
            if format_type:
                format_groups[format_type].append(example)
        
        # Create format patterns
        for format_type, group in format_groups.items():
            if len(group) >= 2:
                pattern_id = f"format_{format_type}"
                
                pattern = KnowledgePattern(
                    pattern_id=pattern_id,
                    pattern_type="format",
                    keywords=self._extract_common_keywords(group),
                    template=self._create_format_template(format_type, group),
                    examples=[ex.output for ex in group[:2]],
                    confidence=0.9,  # Format patterns are usually reliable
                    frequency=len(group)
                )
                patterns.append(pattern)
        
        return patterns
    
    def _get_structure_signature(self, text: str) -> str:
        """Get a signature representing the structure of the text"""
        # Count different structural elements
        lines = text.split('\n')
        structure = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            elif line.startswith('#'):
                structure.append('HEADER')
            elif line.startswith('-') or line.startswith('*'):
                structure.append('LIST')
            elif line.startswith(('1.', '2.', '3.')):
                structure.append('NUMBERED')
            elif line.endswith(':'):
                structure.append('LABEL')
            elif '?' in line:
                structure.append('QUESTION')
            else:
                structure.append('TEXT')
        
        return '_'.join(structure[:10])  # Limit to first 10 elements
    
    def _calculate_formality(self, text: str) -> float:
        """Calculate formality score of text"""
        formal_indicators = ['therefore', 'however', 'furthermore', 'nevertheless', 'consequently']
        informal_indicators = ["don't", "can't", "won't", "I'm", "it's", "that's"]
        
        formal_count = sum(text.lower().count(word) for word in formal_indicators)
        informal_count = sum(text.lower().count(word) for word in informal_indicators)
        
        total_words = len(text.split())
        formal_ratio = formal_count / max(1, total_words) * 100
        informal_ratio = informal_count / max(1, total_words) * 100
        
        return max(0, formal_ratio - informal_ratio)
    
    def _classify_style(self, features: Dict[str, float]) -> str:
        """Classify writing style based on features"""
        if features["formality"] > 2 and features["technical_terms"] > 3:
            return "academic"
        elif features["question_ratio"] > 0.2:
            return "conversational"
        elif features["sentence_length"] > 15:
            return "detailed"
        else:
            return "casual"
    
    def _extract_common_keywords(self, examples: List[TeacherExample]) -> List[str]:
        """Extract common keywords from examples"""
        all_keywords = []
        for ex in examples:
            keywords = ex.context.get("keywords", [])
            all_keywords.extend(keywords)
        
        # Count frequency and return most common
        keyword_counts = defaultdict(int)
        for keyword in all_keywords:
            keyword_counts[keyword] += 1
        
        return [k for k, v in sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
    
    def _create_structure_template(self, examples: List[TeacherExample]) -> str:
        """Create a structure template from examples"""
        return f"Structure template based on {len(examples)} examples"
    
    def _create_style_template(self, group: List[Tuple[TeacherExample, Dict]]) -> str:
        """Create a style template"""
        return f"Style template for {len(group)} examples"
    
    def _create_content_template(self, examples: List[TeacherExample]) -> str:
        """Create a content template"""
        return f"Content template for topic with {len(examples)} examples"
    
    def _detect_format_type(self, text: str) -> Optional[str]:
        """Detect the format type of text"""
        text_lower = text.lower().strip()
        
        if text_lower.startswith('{') and text_lower.endswith('}'):
            return "json"
        elif text_lower.startswith('[') and text_lower.endswith(']'):
            return "list"
        elif '|' in text and '\n' in text:
            return "table"
        elif text.count('\n') > 5 and any(line.strip().startswith(('-', '*')) for line in text.split('\n')):
            return "bullet_list"
        
        return None
    
    def _create_format_template(self, format_type: str, examples: List[TeacherExample]) -> str:
        """Create a format template"""
        return f"{format_type} format template from {len(examples)} examples"


class KnowledgeTransferEngine:
    """Main engine for transferring knowledge from teacher to student"""
    
    def __init__(self):
        self.pattern_extractor = PatternExtractor()
        self.transfer_history: List[Dict[str, Any]] = []
        self.performance_tracker = PerformanceTracker()
    
    async def transfer_knowledge(self, teacher_examples: List[TeacherExample], 
                               student_model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Main knowledge transfer process"""
        start_time = datetime.now()
        
        # Step 1: Extract patterns from teacher examples
        patterns = self.pattern_extractor.extract_patterns(teacher_examples)
        
        # Step 2: Create learning dataset
        learning_dataset = self._create_learning_dataset(patterns, teacher_examples)
        
        # Step 3: Generate transfer instructions
        transfer_instructions = self._generate_transfer_instructions(patterns)
        
        # Step 4: Create evaluation benchmarks
        evaluation_benchmarks = self._create_evaluation_benchmarks(teacher_examples)
        
        transfer_time = (datetime.now() - start_time).total_seconds()
        
        result = {
            "patterns": [self._pattern_to_dict(p) for p in patterns],
            "learning_dataset": learning_dataset,
            "transfer_instructions": transfer_instructions,
            "evaluation_benchmarks": evaluation_benchmarks,
            "transfer_time": transfer_time,
            "metrics": {
                "patterns_extracted": len(patterns),
                "high_confidence_patterns": len([p for p in patterns if p.confidence > 0.8]),
                "coverage": self._calculate_coverage(patterns, teacher_examples)
            }
        }
        
        # Store transfer history
        self.transfer_history.append({
            "timestamp": datetime.now(),
            "teacher_examples": len(teacher_examples),
            "patterns_extracted": len(patterns),
            "result": result
        })
        
        return result
    
    def _create_learning_dataset(self, patterns: List[KnowledgePattern], 
                               teacher_examples: List[TeacherExample]) -> List[Dict[str, Any]]:
        """Create a structured learning dataset for the student"""
        dataset = []
        
        # Add pattern-based examples
        for pattern in patterns:
            dataset.append({
                "type": "pattern_example",
                "pattern_id": pattern.pattern_id,
                "pattern_type": pattern.pattern_type,
                "instruction": f"Follow this {pattern.pattern_type} pattern: {pattern.template}",
                "examples": pattern.examples[:2],
                "keywords": pattern.keywords,
                "confidence": pattern.confidence
            })
        
        # Add raw teacher examples for context
        for example in teacher_examples:
            dataset.append({
                "type": "teacher_example",
                "input": example.input,
                "output": example.output,
                "confidence": example.confidence,
                "keywords": example.context.get("keywords", [])
            })
        
        return dataset
    
    def _generate_transfer_instructions(self, patterns: List[KnowledgePattern]) -> Dict[str, Any]:
        """Generate instructions for the student model"""
        instructions = {
            "general_guidelines": [
                "Follow the patterns learned from high-quality teacher examples",
                "Maintain consistency in style and structure",
                "Use appropriate formality level based on context",
                "Include relevant details while staying concise"
            ],
            "pattern_specific": {}
        }
        
        # Group patterns by type
        pattern_groups = defaultdict(list)
        for pattern in patterns:
            pattern_groups[pattern.pattern_type].append(pattern)
        
        # Create type-specific instructions
        for pattern_type, type_patterns in pattern_groups.items():
            high_confidence = [p for p in type_patterns if p.confidence > 0.7]
            if high_confidence:
                instructions["pattern_specific"][pattern_type] = {
                    "count": len(high_confidence),
                    "templates": [p.template for p in high_confidence[:3]],
                    "keywords": list(set().union(*[p.keywords for p in high_confidence]))
                }
        
        return instructions
    
    def _create_evaluation_benchmarks(self, teacher_examples: List[TeacherExample]) -> List[Dict[str, Any]]:
        """Create benchmarks to evaluate student performance"""
        benchmarks = []
        
        # Select diverse examples as benchmarks
        selected_examples = self._select_diverse_examples(teacher_examples, count=10)
        
        for example in selected_examples:
            benchmarks.append({
                "input": example.input,
                "expected_output": example.output,
                "quality_threshold": example.confidence,
                "keywords": example.context.get("keywords", [])
            })
        
        return benchmarks
    
    def _select_diverse_examples(self, examples: List[TeacherExample], count: int) -> List[TeacherExample]:
        """Select diverse examples for benchmarking"""
        if len(examples) <= count:
            return examples
        
        # Simple diversity selection based on keywords
        selected = []
        used_keywords = set()
        
        # First pass: select examples with unique keyword combinations
        for example in examples:
            keywords = tuple(sorted(example.context.get("keywords", [])))
            if keywords not in used_keywords:
                selected.append(example)
                used_keywords.add(keywords)
                if len(selected) >= count:
                    break
        
        # Fill remaining slots with highest confidence examples
        if len(selected) < count:
            remaining = [ex for ex in examples if ex not in selected]
            remaining.sort(key=lambda x: x.confidence, reverse=True)
            selected.extend(remaining[:count - len(selected)])
        
        return selected
    
    def _calculate_coverage(self, patterns: List[KnowledgePattern], 
                          teacher_examples: List[TeacherExample]) -> float:
        """Calculate how well patterns cover the teacher examples"""
        if not teacher_examples:
            return 0.0
        
        covered = 0
        for example in teacher_examples:
            example_keywords = set(example.context.get("keywords", []))
            
            # Check if any pattern covers this example
            for pattern in patterns:
                pattern_keywords = set(pattern.keywords)
                if pattern_keywords & example_keywords:  # Intersection exists
                    covered += 1
                    break
        
        return covered / len(teacher_examples)
    
    def _pattern_to_dict(self, pattern: KnowledgePattern) -> Dict[str, Any]:
        """Convert pattern to dictionary for serialization"""
        return {
            "pattern_id": pattern.pattern_id,
            "pattern_type": pattern.pattern_type,
            "keywords": pattern.keywords,
            "template": pattern.template,
            "examples": pattern.examples,
            "confidence": pattern.confidence,
            "frequency": pattern.frequency,
            "last_updated": pattern.last_updated.isoformat()
        }


class PerformanceTracker:
    """Tracks performance of knowledge transfer"""
    
    def __init__(self):
        self.metrics_history: List[TransferMetrics] = []
        self.student_performance: Dict[str, List[float]] = defaultdict(list)
    
    def track_transfer_performance(self, before_quality: float, after_quality: float,
                                 patterns_count: int, transfer_time: float) -> TransferMetrics:
        """Track performance of a knowledge transfer"""
        metrics = TransferMetrics(
            patterns_extracted=patterns_count,
            transfer_accuracy=after_quality,
            student_improvement=after_quality - before_quality,
            cost_reduction=0.0,  # To be calculated based on usage
            time_to_learn=transfer_time
        )
        
        self.metrics_history.append(metrics)
        return metrics
    
    def track_student_performance(self, student_id: str, quality_score: float):
        """Track ongoing student performance"""
        self.student_performance[student_id].append(quality_score)
    
    def get_learning_curve(self, student_id: str) -> List[float]:
        """Get learning curve for a student"""
        return self.student_performance.get(student_id, [])
    
    def calculate_transfer_effectiveness(self) -> Dict[str, float]:
        """Calculate overall transfer effectiveness metrics"""
        if not self.metrics_history:
            return {}
        
        return {
            "average_improvement": np.mean([m.student_improvement for m in self.metrics_history]),
            "average_patterns": np.mean([m.patterns_extracted for m in self.metrics_history]),
            "average_transfer_time": np.mean([m.time_to_learn for m in self.metrics_history]),
            "success_rate": len([m for m in self.metrics_history if m.student_improvement > 0]) / len(self.metrics_history)
        }


class AdaptiveLearningManager:
    """Manages adaptive learning strategies for continuous improvement"""
    
    def __init__(self):
        self.learning_strategies: Dict[str, Any] = {
            "pattern_weight_adjustment": True,
            "dynamic_threshold": True,
            "feedback_integration": True
        }
        self.adaptation_history: List[Dict[str, Any]] = []
    
    def adapt_patterns(self, patterns: List[KnowledgePattern], 
                      performance_feedback: List[Dict[str, float]]) -> List[KnowledgePattern]:
        """Adapt patterns based on performance feedback"""
        adapted_patterns = []
        
        for pattern in patterns:
            # Adjust confidence based on feedback
            pattern_feedback = [f for f in performance_feedback 
                              if f.get("pattern_id") == pattern.pattern_id]
            
            if pattern_feedback:
                avg_performance = np.mean([f["performance"] for f in pattern_feedback])
                # Adjust confidence based on actual performance
                new_confidence = (pattern.confidence + avg_performance) / 2
                pattern.confidence = max(0.1, min(1.0, new_confidence))
            
            adapted_patterns.append(pattern)
        
        # Sort by confidence to prioritize high-performing patterns
        adapted_patterns.sort(key=lambda p: p.confidence, reverse=True)
        
        self.adaptation_history.append({
            "timestamp": datetime.now(),
            "patterns_adapted": len(adapted_patterns),
            "feedback_items": len(performance_feedback)
        })
        
        return adapted_patterns
    
    def suggest_improvements(self, transfer_results: Dict[str, Any]) -> List[str]:
        """Suggest improvements based on transfer results"""
        suggestions = []
        
        patterns = transfer_results.get("patterns", [])
        metrics = transfer_results.get("metrics", {})
        
        # Analyze pattern quality
        high_confidence = len([p for p in patterns if p.get("confidence", 0) > 0.8])
        if high_confidence / max(1, len(patterns)) < 0.5:
            suggestions.append("Consider using more diverse teacher examples to improve pattern quality")
        
        # Analyze coverage
        coverage = metrics.get("coverage", 0)
        if coverage < 0.7:
            suggestions.append("Increase teacher example diversity to improve knowledge coverage")
        
        # Analyze pattern distribution
        pattern_types = defaultdict(int)
        for pattern in patterns:
            pattern_types[pattern.get("pattern_type", "unknown")] += 1
        
        if len(pattern_types) < 3:
            suggestions.append("Consider including more varied content types in teacher examples")
        
        return suggestions