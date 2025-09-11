/**
 * 统一配置类 - TypeScript版本
 * 前后端共享的数据生成配置定义
 */

export enum DataType {
  QA = 'qa',
  TRANSLATION = 'translation'
}

export enum OptimizationLevel {
  COST_FIRST = 'cost_first',
  QUALITY_FIRST = 'quality_first', 
  BALANCED = 'balanced',
  ADAPTIVE = 'adaptive'
}

export enum Language {
  ZH = 'zh',
  EN = 'en',
  MIXED = 'mixed'
}

export interface QualityConfig {
  threshold: number; // 0.6 - 0.95
  minThreshold: number;
  maxThreshold: number;
  step: number;
}

export interface CostConfig {
  budgetLimit?: number; // USD
  costPerItemLimit?: number; // USD per item
  optimizationStrategy: OptimizationLevel;
}

export interface DistillationConfig {
  enabled: boolean;
  teacherRatio: number; // 0.1 - 0.3
  minTeacherRatio: number;
  maxTeacherRatio: number;
  step: number;
  enableCaching: boolean;
}

export interface GenerationConfig {
  // 基础配置
  keywords: string[];
  dataType: DataType;
  quantity: number;
  language: Language;
  
  // 质量配置
  quality: QualityConfig;
  
  // 成本配置
  cost: CostConfig;
  
  // 蒸馏配置
  distillation: DistillationConfig;
  
  // 元数据
  projectName?: string;
  tags: string[];
  
  // 时间戳
  createdAt?: string;
}

export interface CostEstimate {
  estimatedCost: number;
  costPerItem: number;
  teacherCost: number;
  studentCost: number;
  traditionalCost: number;
  potentialSavings: number;
  savingsPercentage: number;
}

export interface QualityPreset {
  name: string;
  threshold: number;
  description: string;
  teacherRatio: number;
}

export interface DataTypeOption {
  value: DataType;
  label: string;
  description: string;
}

export interface OptimizationOption {
  value: OptimizationLevel;
  label: string;
  description: string;
}

export class ConfigDefaults {
  static readonly QUANTITY_OPTIONS = [100, 500, 1000, 2000, 5000];
  
  static readonly QUALITY_PRESETS: QualityPreset[] = [
    {
      name: '高效模式',
      threshold: 0.65,
      description: '优先成本效益，适合大规模数据生成',
      teacherRatio: 0.1
    },
    {
      name: '平衡模式', 
      threshold: 0.8,
      description: '质量与成本平衡，推荐选择',
      teacherRatio: 0.2
    },
    {
      name: '高质量模式',
      threshold: 0.9,
      description: '优先质量，适合关键应用场景',
      teacherRatio: 0.3
    }
  ];
  
  static readonly DATA_TYPE_OPTIONS: DataTypeOption[] = [
    {
      value: DataType.QA,
      label: '问答对 (Q&A)',
      description: '生成问题-答案对，适合对话系统和知识问答'
    },
    {
      value: DataType.TRANSLATION,
      label: '机器翻译',
      description: '生成翻译对，适合多语言模型训练'
    }
  ];
  
  static readonly OPTIMIZATION_OPTIONS: OptimizationOption[] = [
    {
      value: OptimizationLevel.COST_FIRST,
      label: '成本优先',
      description: '最大化成本节省，适合大规模数据生成'
    },
    {
      value: OptimizationLevel.BALANCED,
      label: '平衡模式',
      description: '质量与成本平衡，推荐选择'
    },
    {
      value: OptimizationLevel.QUALITY_FIRST,
      label: '质量优先',
      description: '最大化数据质量，适合关键应用'
    },
    {
      value: OptimizationLevel.ADAPTIVE,
      label: '自适应',
      description: '根据数据特点自动调整策略'
    }
  ];
}

export class GenerationConfigHelper {
  static createDefault(): GenerationConfig {
    return {
      keywords: [],
      dataType: DataType.QA,
      quantity: 100,
      language: Language.ZH,
      quality: {
        threshold: 0.8,
        minThreshold: 0.6,
        maxThreshold: 0.95,
        step: 0.05
      },
      cost: {
        optimizationStrategy: OptimizationLevel.BALANCED
      },
      distillation: {
        enabled: true,
        teacherRatio: 0.2,
        minTeacherRatio: 0.1,
        maxTeacherRatio: 0.3,
        step: 0.05,
        enableCaching: true
      },
      tags: []
    };
  }
  
  static toDict(config: GenerationConfig): Record<string, any> {
    return {
      keywords: config.keywords,
      data_type: config.dataType,
      quantity: config.quantity,
      language: config.language,
      quality_threshold: config.quality.threshold,
      budget_limit: config.cost.budgetLimit,
      cost_per_item_limit: config.cost.costPerItemLimit,
      optimization_strategy: config.cost.optimizationStrategy,
      use_distillation: config.distillation.enabled,
      teacher_ratio: config.distillation.teacherRatio,
      enable_caching: config.distillation.enableCaching,
      project_name: config.projectName,
      tags: config.tags,
      created_at: config.createdAt
    };
  }
  
  static fromDict(data: Record<string, any>): GenerationConfig {
    return {
      keywords: data.keywords || [],
      dataType: data.data_type || DataType.QA,
      quantity: data.quantity || 100,
      language: data.language || Language.ZH,
      quality: {
        threshold: data.quality_threshold || 0.8,
        minThreshold: 0.6,
        maxThreshold: 0.95,
        step: 0.05
      },
      cost: {
        budgetLimit: data.budget_limit,
        costPerItemLimit: data.cost_per_item_limit,
        optimizationStrategy: data.optimization_strategy || OptimizationLevel.BALANCED
      },
      distillation: {
        enabled: data.use_distillation !== false,
        teacherRatio: data.teacher_ratio || 0.2,
        minTeacherRatio: 0.1,
        maxTeacherRatio: 0.3,
        step: 0.05,
        enableCaching: data.enable_caching !== false
      },
      projectName: data.project_name,
      tags: data.tags || [],
      createdAt: data.created_at
    };
  }
  
  static getCostEstimate(config: GenerationConfig): CostEstimate {
    const baseCost = config.quantity * 0.01;
    let teacherCost: number;
    let studentCost: number;
    
    if (config.distillation.enabled) {
      teacherCost = config.quantity * config.distillation.teacherRatio * 0.05;
      studentCost = config.quantity * (1 - config.distillation.teacherRatio) * 0.005;
    } else {
      teacherCost = config.quantity * 0.05;
      studentCost = 0;
    }
    
    const totalCost = teacherCost + studentCost;
    const traditionalCost = config.quantity * 0.05;
    const savings = traditionalCost - totalCost;
    const savingsPercentage = traditionalCost > 0 ? (savings / traditionalCost) * 100 : 0;
    
    return {
      estimatedCost: totalCost,
      costPerItem: config.quantity > 0 ? totalCost / config.quantity : 0,
      teacherCost,
      studentCost,
      traditionalCost,
      potentialSavings: savings,
      savingsPercentage
    };
  }
  
  static validateConfig(config: GenerationConfig): string[] {
    const errors: string[] = [];
    
    // 基础验证
    if (!config.keywords || config.keywords.length === 0) {
      errors.push('关键词不能为空');
    }
    
    if (config.quantity < 1 || config.quantity > 10000) {
      errors.push('生成数量必须在 1 到 10000 之间');
    }
    
    // 质量阈值验证
    if (config.quality.threshold < config.quality.minThreshold || 
        config.quality.threshold > config.quality.maxThreshold) {
      errors.push(`质量阈值必须在 ${config.quality.minThreshold} 到 ${config.quality.maxThreshold} 之间`);
    }
    
    // 教师模型比例验证
    if (config.distillation.teacherRatio < config.distillation.minTeacherRatio || 
        config.distillation.teacherRatio > config.distillation.maxTeacherRatio) {
      errors.push(`教师模型比例必须在 ${config.distillation.minTeacherRatio} 到 ${config.distillation.maxTeacherRatio} 之间`);
    }
    
    // 成本验证
    if (config.cost.budgetLimit !== undefined && config.cost.budgetLimit <= 0) {
      errors.push('预算限制必须大于0');
    }
    
    if (config.cost.costPerItemLimit !== undefined && config.cost.costPerItemLimit <= 0) {
      errors.push('单项成本限制必须大于0');
    }
    
    // 预算可行性检查
    if (config.cost.budgetLimit !== undefined) {
      const estimate = this.getCostEstimate(config);
      if (estimate.estimatedCost > config.cost.budgetLimit) {
        errors.push(`预估成本 $${estimate.estimatedCost.toFixed(2)} 超出预算限制 $${config.cost.budgetLimit.toFixed(2)}`);
      }
    }
    
    return errors;
  }
}