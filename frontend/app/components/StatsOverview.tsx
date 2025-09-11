'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from 'react-query'
import { apiService } from '../lib/api'

export function StatsOverview() {
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    // 在客户端设置当前时间，避免hydration错误
    setCurrentTime(new Date().toLocaleString('zh-CN'))
    
    // 每分钟更新时间
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('zh-CN'))
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])
  const { data: systemStatus } = useQuery(
    'system-status',
    () => apiService.getSystemStatus(),
    {
      refetchInterval: 30000, // 30秒刷新一次
      placeholderData: {
        service_status: 'healthy',
        distillation_system_status: {},
        performance_metrics: {
          total_requests: 15000,
          success_rate: 0.98,
          average_quality: 0.85,
          total_cost: 2847.32,
          data_generated: 125000
        },
        timestamp: new Date().toISOString()
      }
    }
  )

  const stats = [
    {
      label: '累计生成数据',
      value: systemStatus?.performance_metrics?.data_generated || 125000,
      suffix: '+',
      description: '高质量训练样本',
      color: 'blue',
      format: 'number'
    },
    {
      label: '平均质量分数',
      value: systemStatus?.performance_metrics?.average_quality || 0.85,
      suffix: '',
      description: '自动质量评估',
      color: 'green',
      format: 'percentage'
    },
    {
      label: '成功率',
      value: systemStatus?.performance_metrics?.success_rate || 0.98,
      suffix: '',
      description: '系统稳定性',
      color: 'purple',
      format: 'percentage'
    },
    {
      label: '节省成本',
      value: 0.8,
      suffix: '',
      description: '相比传统标注',
      color: 'orange',
      format: 'percentage'
    }
  ]

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'number':
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`
        }
        return value.toString()
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">平台实时数据</h2>
          <p className="text-gray-600">系统运行状态和性能指标</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              {/* 背景装饰 */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${getColorClasses(stat.color)} opacity-10 rounded-full -translate-y-4 translate-x-4`} />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getColorClasses(stat.color)} flex items-center justify-center`}>
                    <div className="w-6 h-6 bg-white rounded opacity-90" />
                  </div>
                  
                  {systemStatus?.service_status === 'healthy' ? (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                      <span className="text-xs text-gray-500">实时</span>
                    </div>
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  )}
                </div>
                
                <div className="mb-2">
                  <div className="flex items-end">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatValue(stat.value, stat.format)}
                    </span>
                    {stat.suffix && (
                      <span className="text-lg font-semibold text-gray-600 ml-1">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mb-1">
                  <h3 className="text-sm font-medium text-gray-900">{stat.label}</h3>
                </div>
                
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
              
              {/* 悬停效果 */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${getColorClasses(stat.color)} opacity-0 rounded-2xl`}
                whileHover={{ opacity: 0.05 }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          ))}
        </div>
        
        {/* 系统状态指示器 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-green-50 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
            <span className="text-sm font-medium text-green-800">
              系统运行正常 • 最后更新: {currentTime || '加载中...'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}