'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon, CpuChipIcon, ChartBarIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { StatsOverview } from './components/StatsOverview'
import { FeatureGrid } from './components/FeatureGrid'

export default function HomePage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">AI数据集生成器</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/datasets" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                数据集
              </Link>
              <Link 
                href="/analytics" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                分析
              </Link>
              <Link 
                href="/generate" 
                className="btn btn-primary btn-sm"
              >
                开始生成
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main>
        {/* Hero 区域 */}
        <motion.section 
          className="py-20 px-4 sm:px-6 lg:px-8"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <motion.h1 
                className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6"
                variants={fadeInUp}
              >
                智能化AI训练数据集
                <span className="text-gradient block">一键生成平台</span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
                variants={fadeInUp}
              >
                基于LLM API和知识蒸馏技术，为机器学习团队提供高质量、多样化的训练数据。
                支持问答、分类、代码生成等多种数据类型，成本节省80%+。
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={fadeInUp}
              >
                <Link href="/generate" className="btn btn-primary btn-lg group">
                  立即开始生成
                  <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/docs" className="btn btn-outline btn-lg">
                  查看文档
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* 统计数据 */}
        <StatsOverview />

        {/* 核心功能 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">核心功能特性</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                集成先进的知识蒸馏技术，提供从数据生成到质量控制的完整解决方案
              </p>
            </div>
            
            <FeatureGrid />
          </div>
        </section>

        {/* 工作流程 */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">简单三步，生成高质量数据集</h2>
              <p className="text-lg text-gray-600">无需复杂配置，快速上手</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: '输入关键词',
                  description: '简单输入几个关键词，系统自动解析语义和上下文',
                  icon: <SparklesIcon className="w-8 h-8" />,
                  color: 'blue'
                },
                {
                  step: '02',
                  title: '智能生成',
                  description: '知识蒸馏技术，教师模型指导学生模型高效生成',
                  icon: <CpuChipIcon className="w-8 h-8" />,
                  color: 'purple'
                },
                {
                  step: '03',
                  title: '质量控制',
                  description: '自动质量评估和优化，确保数据集满足训练要求',
                  icon: <ChartBarIcon className="w-8 h-8" />,
                  color: 'green'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${item.color}-100 text-${item.color}-600 mb-6`}>
                      {item.icon}
                    </div>
                    <div className="text-sm font-semibold text-gray-400 mb-2">{item.step}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                  
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full">
                      <div className="flex items-center">
                        <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                        <ArrowRightIcon className="w-5 h-5 text-gray-300 mx-4" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA 区域 */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                准备好开始生成高质量训练数据了吗？
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                加入数千名AI开发者，体验前所未有的数据生成效率
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/generate" className="btn bg-white text-blue-600 hover:bg-gray-100 btn-lg">
                  立即开始免费试用
                </Link>
                <Link href="/contact" className="btn border-white text-white hover:bg-white/10 btn-lg">
                  联系我们
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AI数据集生成器</span>
              </div>
              <p className="text-gray-400 text-sm">
                智能化AI训练数据集生成平台，助力机器学习项目快速发展。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">产品</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">功能特性</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">价格方案</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">文档</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API参考</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">资源</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/blog" className="hover:text-white transition-colors">博客</Link></li>
                <li><Link href="/tutorials" className="hover:text-white transition-colors">教程</Link></li>
                <li><Link href="/examples" className="hover:text-white transition-colors">示例</Link></li>
                <li><Link href="/community" className="hover:text-white transition-colors">社区</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">支持</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">帮助中心</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">联系我们</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">系统状态</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">隐私政策</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 AI数据集生成器. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}