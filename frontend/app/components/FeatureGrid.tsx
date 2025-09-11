'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  SparklesIcon,
  CpuChipIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  ShieldCheckIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

export function FeatureGrid() {
  const features = [
    {
      icon: <SparklesIcon className="w-8 h-8" />,
      title: '知识蒸馏技术',
      description: '教师-学生模型架构，高质量数据生成，成本节省80%+',
      highlight: 'AI核心',
      color: 'blue'
    },
    {
      icon: <CpuChipIcon className="w-8 h-8" />,
      title: '多LLM提供商集成',
      description: '支持OpenAI、Anthropic、Google等主流提供商，智能选择最优模型',
      highlight: '多模型',
      color: 'purple'
    },
    {
      icon: <ChartBarIcon className="w-8 h-8" />,
      title: '智能质量控制',
      description: '自动质量评估、多样性分析、一致性检查，确保数据质量',
      highlight: '质量保证',
      color: 'green'
    },
    {
      icon: <CloudArrowUpIcon className="w-8 h-8" />,
      title: '多格式导出',
      description: '支持JSONL、CSV、Hugging Face等多种格式，一键导出',
      highlight: '即用即走',
      color: 'orange'
    },
    {
      icon: <CurrencyDollarIcon className="w-8 h-8" />,
      title: '成本分析优化',
      description: '实时成本追踪、预算控制、ROI分析，透明化成本管理',
      highlight: '成本透明',
      color: 'emerald'
    },
    {
      icon: <BeakerIcon className="w-8 h-8" />,
      title: '多数据类型支持',
      description: '问答、分类、代码生成、翻译等6+种数据类型',
      highlight: '全场景',
      color: 'cyan'
    },
    {
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      title: '企业级安全',
      description: '数据加密、访问控制、审计日志，符合GDPR等法规',
      highlight: '安全合规',
      color: 'red'
    },
    {
      icon: <RocketLaunchIcon className="w-8 h-8" />,
      title: '批量高性能',
      description: '支持1000+并发请求，单个数据集100万+样本',
      highlight: '高性能',
      color: 'indigo'
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        badge: 'bg-blue-500',
        hover: 'group-hover:bg-blue-50'
      },
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-600',
        badge: 'bg-purple-500',
        hover: 'group-hover:bg-purple-50'
      },
      green: {
        bg: 'bg-green-100',
        text: 'text-green-600',
        badge: 'bg-green-500',
        hover: 'group-hover:bg-green-50'
      },
      orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        badge: 'bg-orange-500',
        hover: 'group-hover:bg-orange-50'
      },
      emerald: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-600',
        badge: 'bg-emerald-500',
        hover: 'group-hover:bg-emerald-50'
      },
      cyan: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-600',
        badge: 'bg-cyan-500',
        hover: 'group-hover:bg-cyan-50'
      },
      red: {
        bg: 'bg-red-100',
        text: 'text-red-600',
        badge: 'bg-red-500',
        hover: 'group-hover:bg-red-50'
      },
      indigo: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-600',
        badge: 'bg-indigo-500',
        hover: 'group-hover:bg-indigo-50'
      }
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.map((feature, index) => {
        const colors = getColorClasses(feature.color)
        
        return (
          <motion.div
            key={index}
            className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
          >
            {/* 背景装饰 */}
            <div className={`absolute inset-0 ${colors.hover} rounded-2xl transition-colors duration-300`} />
            
            {/* 内容 */}
            <div className="relative z-10">
              {/* 顶部标签 */}
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${colors.badge}`}>
                  {feature.highlight}
                </div>
                <div className={`p-2 rounded-xl ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform duration-200`}>
                  {feature.icon}
                </div>
              </div>
              
              {/* 标题和描述 */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
            
            {/* 悬停效果边框 */}
            <div className={`absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-${feature.color}-200 transition-colors duration-300`} />
          </motion.div>
        )
      })}
    </div>
  )
}