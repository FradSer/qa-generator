/**
 * API 服务层
 * 处理与后端API的所有通信
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

// API配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token等
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // 未授权，清除token并重定向到登录页
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    } else if (error.response?.status >= 500) {
      toast.error('服务器错误，请稍后重试')
    } else if (error.response?.status === 422) {
      toast.error('请求参数错误')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('请求超时，请检查网络连接')
    }
    
    return Promise.reject(error)
  }
)

// 类型定义
export interface GenerationRequest {
  keywords: string[]
  data_type: string
  quantity: number
  quality_threshold?: number
  budget_limit?: number
  optimization_strategy?: string
  use_distillation?: boolean
  teacher_ratio?: number
  enable_caching?: boolean
  project_name?: string
  tags?: string[]
}

export interface GenerationResponse {
  generation_id: string
  status: string
  data: any[]
  quality_score: number
  cost: number
  generation_time: number
  model_used: string
  metadata: any
  created_at: string
}

export interface DatasetExportRequest {
  generation_id: string
  format: string
  include_metadata?: boolean
  compression?: string
}

export interface SystemStatus {
  service_status: string
  distillation_system_status: any
  performance_metrics: {
    total_requests: number
    success_rate: number
    average_quality: number
    total_cost: number
    data_generated: number
  }
  timestamp: string
}

export interface CostAnalysis {
  period: string
  total_cost: number
  daily_costs: Array<{
    date: string
    cost: number
  }>
  cost_breakdown: {
    teacher_models: number
    student_models: number
    validation: number
  }
  provider_costs: Record<string, number>
  savings_vs_traditional: {
    traditional_cost_estimate: number
    actual_cost: number
    savings: number
    savings_percentage: number
  }
}

export interface QualityAnalysis {
  period: string
  average_quality: number
  quality_trend: Array<{
    date: string
    quality: number
  }>
  quality_distribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  common_issues: string[]
  improvement_suggestions: string[]
}

// API服务类
class ApiService {
  // 健康检查
  async healthCheck() {
    const response = await apiClient.get('/api/health')
    return response.data
  }

  // 数据生成相关
  async generateDataset(request: GenerationRequest): Promise<GenerationResponse> {
    const response = await apiClient.post('/api/datasets/generate', request)
    return response.data
  }

  async getGenerationStatus(generationId: string) {
    const response = await apiClient.get(`/api/datasets/generation/${generationId}`)
    return response.data
  }

  async listDatasets(params: {
    skip?: number
    limit?: number
    data_type?: string
  } = {}) {
    const response = await apiClient.get('/api/datasets', { params })
    return response.data
  }

  // 导出相关
  async exportDataset(request: DatasetExportRequest) {
    const response = await apiClient.post('/api/datasets/export', request, {
      responseType: 'blob'
    })
    return response
  }

  // 验证相关
  async validateDataset(generationId: string, sampleRatio: number = 0.1) {
    const response = await apiClient.post('/api/datasets/validate', {
      generation_id: generationId,
      sample_ratio: sampleRatio
    })
    return response.data
  }

  // 分析相关
  async getCostAnalysis(days: number = 7): Promise<CostAnalysis> {
    const response = await apiClient.get('/api/analytics/cost', {
      params: { days }
    })
    return response.data
  }

  async getQualityAnalysis(days: number = 7): Promise<QualityAnalysis> {
    const response = await apiClient.get('/api/analytics/quality', {
      params: { days }
    })
    return response.data
  }

  // 系统相关
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await apiClient.get('/api/system/status')
    return response.data
  }

  async optimizeSystem() {
    const response = await apiClient.post('/api/system/optimize')
    return response.data
  }

  async getProviders() {
    const response = await apiClient.get('/api/providers')
    return response.data
  }

  async getSupportedDataTypes() {
    const response = await apiClient.get('/api/data-types')
    return response.data
  }

  // 批量处理
  async batchGenerate(requests: GenerationRequest[]) {
    const response = await apiClient.post('/api/datasets/batch-generate', {
      requests,
      parallel_execution: true
    })
    return response.data
  }

  // 成本估算
  async estimateCost(request: GenerationRequest) {
    // 本地估算，避免频繁请求
    const baseCosts = {
      qa: 0.02,
      classification: 0.015,
      generation: 0.03,
      code: 0.04,
      translation: 0.025,
      ner: 0.02
    }

    const baseCostPerItem = baseCosts[request.data_type as keyof typeof baseCosts] || 0.02
    let estimatedTotal = request.quantity * baseCostPerItem

    // 质量阈值影响
    if (request.quality_threshold && request.quality_threshold > 0.8) {
      const qualityMultiplier = 1 + (request.quality_threshold - 0.8) * 0.5
      estimatedTotal *= qualityMultiplier
    }

    // 知识蒸馏节省
    if (request.use_distillation) {
      estimatedTotal *= 0.7 // 30%节省
    }

    return {
      estimated_total_cost: Number(estimatedTotal.toFixed(4)),
      cost_per_item: Number((estimatedTotal / request.quantity).toFixed(4)),
      breakdown: {
        base_cost: Number((request.quantity * baseCostPerItem).toFixed(4)),
        distillation_savings: request.use_distillation ? 
          Number((request.quantity * baseCostPerItem * 0.3).toFixed(4)) : 0
      },
      budget_check: {
        within_budget: !request.budget_limit || estimatedTotal <= request.budget_limit,
        budget_utilization: request.budget_limit ? 
          Number((estimatedTotal / request.budget_limit * 100).toFixed(1)) : null
      }
    }
  }
}

// 导出API服务实例
export const apiService = new ApiService()

// 工具函数
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  } else if (cost < 1) {
    return `$${cost.toFixed(3)}`
  } else {
    return `$${cost.toFixed(2)}`
  }
}

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export default apiService