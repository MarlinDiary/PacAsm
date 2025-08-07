import { Square, ArrowDownToDot, ArrowUpFromDot, RefreshCcw } from 'lucide-react'

interface DebuggerBarProps {
  onReturnClick?: () => void
  onStopClick?: () => void
  onStepDown?: () => void
  onStepUp?: () => void
}

export default function DebuggerBar({ onReturnClick, onStopClick, onStepDown, onStepUp }: DebuggerBarProps) {
  const handleStopClick = () => {
    onStopClick?.()
    onReturnClick?.()
  }

  return (
    <div className="flex items-center h-8">
      {/* Square button */}
      <button 
        onClick={handleStopClick}
        className="w-8 h-8 p-2 bg-[#e7e7e7] hover:bg-[#e2e2e2] rounded-l-sm flex items-center justify-center"
      >
        <Square size={16} color="#e34940" fill="#e34940" />
      </button>
      
      {/* Divider */}
      <div className="w-px h-8 bg-[#f0f0f0]"></div>
      
      {/* Long bar with three buttons */}
      <div className="h-8 bg-[#e7e7e7] rounded-r-sm flex">
        {/* Arrow down to dot button - Step Down */}
        <button 
          onClick={onStepDown}
          className="w-8 h-8 p-2 hover:bg-[#e2e2e2] flex items-center justify-center"
        >
          <ArrowDownToDot size={16} color="#3679f5" />
        </button>
        
        {/* Arrow up from dot button - Step Up */}
        <button 
          onClick={onStepUp}
          className="w-8 h-8 p-2 hover:bg-[#e2e2e2] flex items-center justify-center"
        >
          <ArrowUpFromDot size={16} color="#3679f5" />
        </button>
        
        {/* Refresh ccw button */}
        <button className="w-8 h-8 p-2 hover:bg-[#e2e2e2] rounded-r-sm flex items-center justify-center">
          <RefreshCcw size={16} color="#50b040" />
        </button>
      </div>
    </div>
  )
}