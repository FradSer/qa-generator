import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI微调数据集生成器 - 智能化AI训练数据生成平台',
  description: '基于知识蒸馏技术的AI训练数据集生成平台，为机器学习团队提供高质量、多样化的训练数据，成本节省80%+',
  keywords: '人工智能,机器学习,数据集生成,知识蒸馏,训练数据,LLM,OpenAI,Claude',
  authors: [{ name: 'FradSer' }],
  openGraph: {
    title: 'AI微调数据集生成器',
    description: '基于知识蒸馏技术的智能化AI训练数据生成平台',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}