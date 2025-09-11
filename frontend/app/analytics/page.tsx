'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← 返回首页
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">数据分析</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            数据分析功能正在开发中...
          </p>
        </div>
      </div>
    </div>
  )
}