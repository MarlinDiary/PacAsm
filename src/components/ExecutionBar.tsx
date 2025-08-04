import { Bug, Play, Feather } from 'lucide-react'
import { useState } from 'react'
import StatusBar from './StatusBar'

interface ExecutionBarProps {
  onDebugClick?: () => void
}

export default function ExecutionBar({ onDebugClick }: ExecutionBarProps) {
  const [showStatusBar, setShowStatusBar] = useState(false)
  return (
    <div>
      {!showStatusBar ? (
        <div className="flex items-center h-8">
          {/* Debug button */}
          <button 
            onClick={onDebugClick}
            className="w-8 h-8 p-2 bg-[#e7e7e7] hover:bg-[#e2e2e2] rounded-l-sm flex items-center justify-center"
          >
            <Bug size={16} color="#f2a53f" />
          </button>
          
          {/* First divider */}
          <div className="w-px h-8 bg-[#f0f0f0]"></div>
          
          {/* Play button */}
          <button 
            onClick={() => setShowStatusBar(true)}
            className="w-8 h-8 p-2 bg-[#e7e7e7] hover:bg-[#e2e2e2] flex items-center justify-center"
          >
            <Play size={16} color="#686868" fill="#686868" />
          </button>
          
          {/* Second divider */}
          <div className="w-px h-8 bg-[#f0f0f0]"></div>
          
          {/* Hint button */}
          <button className="h-8 px-3 bg-[#e7e7e7] hover:bg-[#e2e2e2] rounded-r-sm flex items-center gap-1">
            <Feather size={16} color="#50b040" />
            <span className="text-sm font-medium" style={{ color: '#50b040' }}>
              Hint
            </span>
          </button>
        </div>
      ) : (
        <StatusBar />
      )}
    </div>
  )
}