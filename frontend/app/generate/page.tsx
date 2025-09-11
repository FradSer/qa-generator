'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, SparklesIcon, CpuChipIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

export default function GeneratePage() {
  const [formData, setFormData] = useState({
    keywords: '',
    datasetType: 'qa',
    count: 100,
    difficulty: 'medium',
    language: 'zh',
  })

  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    
    try {
      // TODO: Call backend API
      console.log('Generating dataset with:', formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
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
          <p className="text-lg text-gray-600">
            基于关键词生成高质量的AI训练数据集
          </p>
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
            
            <form onSubmit={handleSubmit} className="card-body space-y-6">
              {/* 关键词输入 */}
              <div>
                <label className="form-label">
                  关键词 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="请输入相关关键词，用逗号分隔，例如：人工智能, 机器学习, 深度学习"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  required
                />
                <p className="form-help">
                  关键词将用于生成相关的问答对或分类数据
                </p>
              </div>

              {/* 数据集类型 */}
              <div>
                <label className="form-label">数据集类型</label>
                <select
                  className="form-select"
                  value={formData.datasetType}
                  onChange={(e) => setFormData({ ...formData, datasetType: e.target.value })}
                >
                  <option value="qa">问答对 (Q&A)</option>
                  <option value="classification">文本分类</option>
                  <option value="summarization">文本摘要</option>
                  <option value="translation">机器翻译</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 生成数量 */}
                <div>
                  <label className="form-label">生成数量</label>
                  <select
                    className="form-select"
                    value={formData.count}
                    onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })}
                  >
                    <option value={50}>50 条</option>
                    <option value={100}>100 条</option>
                    <option value={500}>500 条</option>
                    <option value={1000}>1000 条</option>
                  </select>
                </div>

                {/* 难度级别 */}
                <div>
                  <label className="form-label">难度级别</label>
                  <select
                    className="form-select"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>

                {/* 语言 */}
                <div>
                  <label className="form-label">语言</label>
                  <select
                    className="form-select"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  >
                    <option value="zh">中文</option>
                    <option value="en">英文</option>
                    <option value="mixed">中英混合</option>
                  </select>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link href="/" className="btn btn-outline">
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={isGenerating || !formData.keywords.trim()}
                  className={`btn btn-primary ${isGenerating ? 'btn-disabled' : ''}`}
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