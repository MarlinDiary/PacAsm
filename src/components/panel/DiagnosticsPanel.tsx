interface DiagnosticsPanelProps {
  // Add props as needed in the future
}

export default function DiagnosticsPanel({}: DiagnosticsPanelProps) {
  // Temporarily no data
  const hasData = false
  
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
    <div className="w-full h-full p-4">
      {/* Future diagnostics content */}
    </div>
  )
}