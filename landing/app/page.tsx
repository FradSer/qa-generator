'use client'

import { 
  BrainIcon, 
  Zap, 
  Target, 
  DollarSign, 
  BarChart3, 
  CheckCircle,
  ArrowRight,
  Github,
  Star,
  Users
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const features = [
  {
    icon: BrainIcon,
    title: '知识蒸馏技术',
    description: '教师-学生模型架构，通过高质量模型指导低成本模型学习，实现成本与质量的最佳平衡',
    stats: '成本节省80%+'
  },
  {
    icon: Zap,
    title: '多LLM提供商集成',
    description: '支持OpenAI、Anthropic、Google等主流提供商，智能选择最佳模型组合，确保最优性价比',
    stats: '支持4+提供商'
  },
  {
    icon: Target,
    title: '智能质量控制',
    description: '自动质量评估、多样性分析、一致性检查，确保生成的训练数据符合高标准要求',
    stats: '质量分数85-95%'
  },
  {
    icon: BarChart3,
    title: '成本分析优化',
    description: '实时成本追踪、预算控制、ROI分析，帮助团队精确控制AI训练成本投入',
    stats: '实时监控'
  }
]

const dataTypes = [
  '问答对 (Q&A)', '文本分类', '文本生成', '代码生成', '翻译对', '实体识别'
]

const exportFormats = [
  'JSON/JSONL', 'CSV', 'Hugging Face', 'OpenAI JSONL', 'PyTorch', 'TensorFlow'
]

const stats = [
  { value: '80%+', label: '成本节省' },
  { value: '1000+', label: '并发处理' },
  { value: '85-95%', label: '质量保持' },
  { value: '99.9%', label: '可用性' }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 fixed w-full z-50">
        <div className="container-center">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <BrainIcon className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold gradient-text">AI数据集生成器</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">功能特性</a>
              <a href="#architecture" className="text-gray-700 hover:text-blue-600 transition-colors">系统架构</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">成本对比</a>
              <Link 
                href="/app" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                开始使用
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-gradient text-white section-padding pt-32">
        <div className="container-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              智能化AI训练
              <br />
              <span className="text-yellow-300">数据集生成平台</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              基于知识蒸馏技术，为机器学习团队提供高质量、多样化的训练数据
              <br />
              相比传统方法节省80%+成本，质量保持85-95%
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/app"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center justify-center"
              >
                立即开始
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a 
                href="#features"
                className="glass-effect text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
              >
                了解更多
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 section-padding">
        <div className="container-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg p-6 shadow-sm"
              >
                <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding">
        <div className="container-center">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">核心功能特性</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              通过先进的知识蒸馏技术和多提供商集成，为您提供最优质的AI训练数据生成解决方案
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="feature-card"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-600 mb-3">{feature.description}</p>
                    <div className="text-sm font-semibold text-blue-600">{feature.stats}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Data Types & Export Formats */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="feature-card">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="h-6 w-6 text-blue-600 mr-2" />
                支持的数据类型
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {dataTypes.map((type, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {type}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="feature-card">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                导出格式支持
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {exportFormats.map((format, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {format}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="bg-gray-50 section-padding">
        <div className="container-center">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">系统架构</h2>
            <p className="text-xl text-gray-600">
              基于知识蒸馏的4阶段数据生成流程
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: '1', title: '教师生成', desc: '高质量种子数据' },
                { step: '2', title: '模式学习', desc: '提取生成模式' },
                { step: '3', title: '批量生成', desc: '学生模型生成' },
                { step: '4', title: '质量验证', desc: '自动化质量检查' }
              ].map((phase, index) => (
                <div key={index} className="text-center">
                  <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {phase.step}
                  </div>
                  <h3 className="font-semibold mb-2">{phase.title}</h3>
                  <p className="text-sm text-gray-600">{phase.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section id="pricing" className="section-padding">
        <div className="container-center">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">成本对比</h2>
            <p className="text-xl text-gray-600">
              相比传统方法，显著降低训练数据获取成本
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="feature-card text-center">
              <h3 className="text-xl font-semibold mb-4 text-red-600">人工标注</h3>
              <div className="text-3xl font-bold mb-4 text-red-600">$1000</div>
              <div className="text-sm text-gray-600">每1000条数据</div>
            </div>
            
            <div className="feature-card text-center border-2 border-blue-600">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
                推荐方案
              </div>
              <h3 className="text-xl font-semibold mb-4 text-blue-600">知识蒸馏</h3>
              <div className="text-3xl font-bold mb-4 text-blue-600">$200</div>
              <div className="text-sm text-gray-600">每1000条数据</div>
            </div>
            
            <div className="feature-card text-center">
              <h3 className="text-xl font-semibold mb-4 text-orange-600">单一模型</h3>
              <div className="text-3xl font-bold mb-4 text-orange-600">$700</div>
              <div className="text-sm text-gray-600">每1000条数据</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white section-padding">
        <div className="container-center text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            开始构建您的AI训练数据集
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            立即体验知识蒸馏技术带来的高效、经济的数据生成解决方案
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/app"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center justify-center"
            >
              立即开始使用
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="https://github.com/your-repo/qa-generator"
              className="glass-effect text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors inline-flex items-center justify-center"
            >
              <Github className="mr-2 h-5 w-5" />
              查看源码
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 section-padding">
        <div className="container-center">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BrainIcon className="h-6 w-6 text-blue-400" />
                <span className="font-bold text-white">AI数据集生成器</span>
              </div>
              <p className="text-sm text-gray-400">
                基于知识蒸馏技术的智能化AI训练数据生成平台
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">产品功能</h3>
              <div className="space-y-2 text-sm">
                <div>知识蒸馏</div>
                <div>质量控制</div>
                <div>成本优化</div>
                <div>多格式导出</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">支持服务</h3>
              <div className="space-y-2 text-sm">
                <div>OpenAI</div>
                <div>Anthropic</div>
                <div>Google Gemini</div>
                <div>本地模型</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">资源链接</h3>
              <div className="space-y-2 text-sm">
                <div>使用文档</div>
                <div>API参考</div>
                <div>GitHub</div>
                <div>问题反馈</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 AI微调数据集生成器. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}