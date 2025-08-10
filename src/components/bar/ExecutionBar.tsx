import { Bug, Play, Feather, Award } from 'lucide-react'
import { useState, useEffect } from 'react'
import StatusBar from './StatusBar'

interface ExecutionBarProps {
  onDebugClick?: () => void
  onPlayClick?: () => void
  isDebugMode?: boolean
  isPlayMode?: boolean
  playStatus?: 'running'
  hasWon?: boolean
  hint?: string
}

export default function ExecutionBar({ onDebugClick, onPlayClick, isDebugMode, isPlayMode, playStatus, hasWon, hint }: ExecutionBarProps) {
  const [showStatusBar, setShowStatusBar] = useState(false)
  const [showHintCard, setShowHintCard] = useState(false)

  // Show status bar only when running
  useEffect(() => {
    setShowStatusBar(playStatus === 'running')
  }, [playStatus])

  const handlePlayClick = () => {
    onPlayClick?.()
  }

  const handleDebugClick = () => {
    onDebugClick?.()
  }

  return (
    <div className="relative">
      <div className={`absolute inset-0 transition-opacity duration-200 ${showStatusBar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <StatusBar />
      </div>
      <div className={`flex items-center h-8 transition-all duration-200 ${showStatusBar || isDebugMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${showStatusBar || isDebugMode ? '' : ''}`}>
        {/* Debug button */}
        <button 
          onClick={handleDebugClick}
          className="w-8 h-8 p-2 bg-[#e7e7e7] hover:bg-[#e2e2e2] rounded-l-sm flex items-center justify-center"
        >
          <Bug size={16} color="#f2a53f" />
        </button>
        
        {/* First divider */}
        <div className="w-px h-8 bg-[#f0f0f0]"></div>
        
        {/* Play button */}
        <button 
          onClick={handlePlayClick}
          className="w-8 h-8 p-2 bg-[#e7e7e7] hover:bg-[#e2e2e2] flex items-center justify-center"
        >
          <Play size={16} color="#686868" fill="#686868" />
        </button>
        
        {/* Second divider */}
        <div className="w-px h-8 bg-[#f0f0f0]"></div>
        
        {/* Hint/Next button */}
        <div className="relative">
          <button 
            className={`h-8 bg-[#e7e7e7] hover:bg-[#e2e2e2] rounded-r-sm flex items-center gap-1 transition-all duration-200 ${showStatusBar || isDebugMode ? 'px-2' : 'px-3'}`}
            onMouseEnter={() => !hasWon && setShowHintCard(true)}
            onMouseLeave={() => setShowHintCard(false)}
          >
            {hasWon ? (
              <Award size={16} color="#50b040" />
            ) : (
              <Feather size={16} color="#50b040" />
            )}
            <span className="text-sm font-medium" style={{ color: '#50b040' }}>
              {hasWon ? 'Next' : 'Hint'}
            </span>
          </button>
          
          {/* Hint Card */}
          {!hasWon && (
            <div 
              className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 rounded-lg shadow-lg z-50 pointer-events-none transition-opacity duration-150 ${
                showHintCard ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                backgroundColor: 'white',
                padding: '16px'
              }}
            >
              <p style={{ 
                fontSize: '14px', 
                color: '#5a5a5a',
                margin: 0,
                lineHeight: '1.5',
                whiteSpace: 'nowrap'
              }}>
                {hint || 'No hint available for this level'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}