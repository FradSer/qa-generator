'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, SparklesIcon, CpuChipIcon, DocumentArrowDownIcon, CurrencyDollarIcon, AcademicCapIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { 
  GenerationConfig, 
  GenerationConfigHelper, 
  ConfigDefaults, 
  DataType, 
  Language,
  OptimizationLevel,
  CostEstimate 
} from '../../../shared/config-types'

export default function GeneratePage() {
  const [config, setConfig] = useState<GenerationConfig>(GenerationConfigHelper.createDefault())
  const [keywordsInput, setKeywordsInput] = useState('')
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Update cost estimate when config changes
  useEffect(() => {
    const estimate = GenerationConfigHelper.getCostEstimate(config)
    setCostEstimate(estimate)
    const errors = GenerationConfigHelper.validateConfig(config)
    setValidationErrors(errors)
  }, [config])

  // Update keywords in config
  useEffect(() => {
    const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0)
    setConfig(prev => ({ ...prev, keywords }))
  }, [keywordsInput])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    
    try {
      // Validate config before submission
      const errors = GenerationConfigHelper.validateConfig(config)
      if (errors.length > 0) {
        console.error('Configuration errors:', errors)
        return
      }

      // Convert to API format
      const apiData = GenerationConfigHelper.toDict(config)
      console.log('Generating dataset with:', apiData)
      
      // TODO: Call backend API
      // const response = await fetch('/api/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(apiData)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const applyQualityPreset = (preset: any) => {
    setConfig(prev => ({
      ...prev,
      quality: { ...prev.quality, threshold: preset.threshold },
      distillation: { ...prev.distillation, teacherRatio: preset.teacherRatio }
    }))
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>返回首页</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">数据集生成</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            智能数据集生成
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            基于知识蒸馏技术，生成高质量、低成本的AI训练数据集
          </p>
          {costEstimate && (
            <div className="inline-flex items-center gap-4 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
              <span>预估成本: <strong className="text-blue-600">${costEstimate.estimatedCost.toFixed(2)}</strong></span>
              <span>节省: <strong className="text-green-600">{costEstimate.savingsPercentage.toFixed(0)}%</strong></span>
              <span>单价: <strong className="text-gray-700">${costEstimate.costPerItem.toFixed(3)}</strong></span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <CpuChipIcon className="w-6 h-6 mr-2 text-blue-600" />
                生成配置
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="card-body space-y-8">
              {/* 关键词输入 */}
              <div>
                <label className="form-label">
                  关键词 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="请输入相关关键词，用逗号分隔，例如：人工智能, 机器学习, 深度学习"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  required
                />
                <p className="form-help">
                  关键词将用于生成相关的训练数据
                </p>
              </div>

              {/* 基础配置 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 数据集类型 */}
                <div>
                  <label className="form-label">数据集类型</label>
                  <select
                    className="form-select"
                    value={config.dataType}
                    onChange={(e) => setConfig(prev => ({ ...prev, dataType: e.target.value as DataType }))}
                  >
                    {ConfigDefaults.DATA_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="form-help text-xs mt-1">
                    {ConfigDefaults.DATA_TYPE_OPTIONS.find(opt => opt.value === config.dataType)?.description}
                  </p>
                </div>

                {/* 生成数量 */}
                <div>
                  <label className="form-label">生成数量</label>
                  <select
                    className="form-select"
                    value={config.quantity}
                    onChange={(e) => setConfig(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                  >
                    {ConfigDefaults.QUANTITY_OPTIONS.map(count => (
                      <option key={count} value={count}>{count} 条</option>
                    ))}
                  </select>
                </div>

                {/* 语言 */}
                <div>
                  <label className="form-label">语言</label>
                  <select
                    className="form-select"
                    value={config.language}
                    onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value as Language }))}
                  >
                    <option value={Language.ZH}>中文</option>
                    <option value={Language.EN}>英文</option>
                    <option value={Language.MIXED}>中英混合</option>
                  </select>
                </div>
              </div>

              {/* 质量预设快捷按钮 */}
              <div>
                <label className="form-label">质量预设</label>
                <div className="grid grid-cols-3 gap-3">
                  {ConfigDefaults.QUALITY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyQualityPreset(preset)}
                      className={`p-3 rounded-lg border text-left transition-colors ${\n                        config.quality.threshold === preset.threshold\n                          ? 'border-blue-500 bg-blue-50 text-blue-700'\n                          : 'border-gray-300 hover:border-gray-400'\n                      }`}
                    >
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{preset.description}</div>\n                      <div className="text-xs text-blue-600 mt-1">质量: {preset.threshold}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 精细质量控制 */}
              <div>
                <label className="form-label">
                  质量阈值: {config.quality.threshold.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={config.quality.minThreshold}
                  max={config.quality.maxThreshold}
                  step={config.quality.step}
                  value={config.quality.threshold}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    quality: { ...prev.quality, threshold: parseFloat(e.target.value) }
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>高效 ({config.quality.minThreshold})</span>
                  <span>平衡 (0.8)</span>
                  <span>高质 ({config.quality.maxThreshold})</span>
                </div>
              </div>

              {/* 高级选项切换 */}
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
                </button>
              </div>

              {/* 高级选项 */}
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 border rounded-lg p-6 bg-gray-50"
                >
                  {/* 成本控制 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600" />
                      成本控制
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="form-label">预算限制 (USD)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="可选，如: 10.00"
                          min="0"
                          step="0.01"
                          value={config.cost.budgetLimit || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cost: { 
                              ...prev.cost, 
                              budgetLimit: e.target.value ? parseFloat(e.target.value) : undefined 
                            }
                          }))}
                        />
                      </div>
                      
                      <div>
                        <label className="form-label">单项成本限制 (USD)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="可选，如: 0.01"
                          min="0"
                          step="0.001"
                          value={config.cost.costPerItemLimit || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cost: { 
                              ...prev.cost, 
                              costPerItemLimit: e.target.value ? parseFloat(e.target.value) : undefined 
                            }
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">优化策略</label>
                      <select
                        className="form-select"
                        value={config.cost.optimizationStrategy}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          cost: { ...prev.cost, optimizationStrategy: e.target.value as OptimizationLevel }
                        }))}
                      >
                        {ConfigDefaults.OPTIMIZATION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="form-help text-xs mt-1">
                        {ConfigDefaults.OPTIMIZATION_OPTIONS.find(opt => opt.value === config.cost.optimizationStrategy)?.description}
                      </p>
                    </div>
                  </div>

                  {/* 知识蒸馏设置 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
                      知识蒸馏
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="enable-distillation"
                          checked={config.distillation.enabled}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            distillation: { ...prev.distillation, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="enable-distillation" className="text-sm font-medium text-gray-700">
                          启用知识蒸馏 (推荐)
                        </label>
                      </div>
                      
                      {config.distillation.enabled && (
                        <>
                          <div>
                            <label className="form-label">
                              教师模型比例: {config.distillation.teacherRatio.toFixed(2)}
                            </label>
                            <input
                              type="range"
                              min={config.distillation.minTeacherRatio}
                              max={config.distillation.maxTeacherRatio}
                              step={config.distillation.step}
                              value={config.distillation.teacherRatio}
                              onChange={(e) => setConfig(prev => ({
                                ...prev,
                                distillation: { ...prev.distillation, teacherRatio: parseFloat(e.target.value) }
                              }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>经济 ({config.distillation.minTeacherRatio})</span>
                              <span>平衡 (0.2)</span>
                              <span>高质 ({config.distillation.maxTeacherRatio})</span>
                            </div>
                            <p className="form-help text-xs mt-2">
                              教师模型比例越高，质量越好但成本也越高。推荐值: 0.2
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="enable-caching"
                              checked={config.distillation.enableCaching}
                              onChange={(e) => setConfig(prev => ({
                                ...prev,
                                distillation: { ...prev.distillation, enableCaching: e.target.checked }
                              }))}
                              className="w-4 h-4 text-blue-600"
                            />
                            <label htmlFor="enable-caching" className="text-sm font-medium text-gray-700">
                              启用模式缓存 (提升性能)
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 项目信息 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">项目信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">项目名称</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="可选，如: 客服机器人训练集"
                          value={config.projectName || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value || undefined }))}
                        />
                      </div>
                      
                      <div>
                        <label className="form-label">标签</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="可选，用逗号分隔，如: AI, 客服, 训练"
                          value={config.tags.join(', ')}
                          onChange={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t.length > 0)
                            setConfig(prev => ({ ...prev, tags }))
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 验证错误提示 */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">配置错误:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link href="/" className="btn btn-outline">
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={isGenerating || validationErrors.length > 0 || config.keywords.length === 0}
                  className={`btn btn-primary ${isGenerating || validationErrors.length > 0 || config.keywords.length === 0 ? 'btn-disabled' : ''}`}
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2"></div>
                      生成中...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                      开始生成
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* 生成说明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">生成说明</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 生成时间根据数据量而定，通常50-100条数据需要1-2分钟</li>
              <li>• 系统会自动进行质量检测和去重处理</li>
              <li>• 生成完成后可直接下载JSON、CSV或TXT格式文件</li>
              <li>• 支持批量生成，大数据集建议分批处理</li>
            </ul>
          </div>
        </motion.div>
      </main>
    </div>
  )
}