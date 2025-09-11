'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon, CpuChipIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { StatsOverview } from './components/StatsOverview'
import { FeatureGrid } from './components/FeatureGrid'

export default function AppHomePage() {
  const router = useRouter()
  
  // 默认重定向到生成页面，这是应用的主要功能
  useEffect(() => {
    router.push('/generate')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <SparklesIcon className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">正在跳转到数据生成工具...</h1>
        <p className="text-gray-600">如果没有自动跳转，请点击 <Link href="/generate" className="text-blue-600 hover:underline">这里</Link></p>
      </div>
    </div>
  )
}