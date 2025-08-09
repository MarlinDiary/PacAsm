'use client'

import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import ErrorCard from '../ErrorCard'

// Props type will be added when needed
type DiagnosticsPanelProps = Record<string, never>

export default function DiagnosticsPanel({}: DiagnosticsPanelProps) {
  const errors = useDiagnosticsStore((state) => state.errors)
  const hasData = errors.length > 0
  
  if (!hasData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <img 
          src="/res/null.png" 
          alt="No diagnostics" 
          style={{ width: '200px', flexShrink: 0, pointerEvents: 'none', userSelect: 'none' }}
        />
        <div style={{ color: '#c4c4c6', fontSize: '14px' }}>
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
      {errors.map((error) => (
        <ErrorCard
          key={error.id}
          error={error.error}
          code={error.code}
          timestamp={error.timestamp}
          diagnosis={error.diagnosis}
          isLoading={error.isLoading}
        />
      ))}
    </div>
  )
}