'use client'

import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import ErrorCard from '../ErrorCard'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

// Props type will be added when needed
type DiagnosticsPanelProps = Record<string, never>

export default function DiagnosticsPanel({}: DiagnosticsPanelProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const errors = useDiagnosticsStore((state) => state.errors)
  const hasData = errors.length > 0
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const currentTheme = mounted ? (theme === 'system' ? resolvedTheme : theme) : 'light'
  
  if (!hasData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <img 
          src={currentTheme === 'dark' ? '/res/null-dark.png' : '/res/null.png'} 
          alt="No diagnostics" 
          style={{ width: '200px', flexShrink: 0, pointerEvents: 'none', userSelect: 'none' }}
        />
        <div className="text-[#c4c4c6] dark:text-[#626265] text-sm">
          No diagnostics data available
        </div>
      </div>
    )
  }
  
  return (
    <div 
      className="w-full h-full p-4 overflow-y-auto"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {errors.map((error, index) => (
        <div key={error.id} className={index < errors.length - 1 ? 'mb-4' : ''}>
          <ErrorCard
            error={error.error}
            code={error.code}
            timestamp={error.timestamp}
            diagnosis={error.diagnosis}
            isLoading={error.isLoading}
          />
        </div>
      ))}
    </div>
  )
}