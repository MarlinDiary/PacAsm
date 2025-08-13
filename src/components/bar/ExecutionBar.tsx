import { Bug, Play, Feather, Award } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StatusBar from './StatusBar'

interface ExecutionBarProps {
  onDebugClick?: () => void
  onPlayClick?: () => void
  isDebugMode?: boolean
  isPlayMode?: boolean
  playStatus?: 'running'
  hasWon?: boolean
  hint?: string
  currentLevel?: string
  isInitializing?: boolean
}

export default function ExecutionBar({ onDebugClick, onPlayClick, isDebugMode, isPlayMode, playStatus, hasWon, hint, currentLevel, isInitializing }: ExecutionBarProps) {
  const router = useRouter()
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

  const handleNextClick = () => {
    if (hasWon && currentLevel) {
      const nextLevel = parseInt(currentLevel) + 1
      router.push(`/level/${nextLevel}`)
    }
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
          disabled={isInitializing}
          className={`w-8 h-8 p-2 bg-[#e7e7e7] dark:bg-[#222222] rounded-l-sm flex items-center justify-center ${isInitializing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e2e2e2] dark:hover:bg-[#2a2a2a] cursor-pointer'}`}
        >
          <Bug size={16} color="#f2a53f" />
        </button>
        
        {/* First divider */}
        <div className="w-px h-8 bg-[#f0f0f0] dark:bg-[#0f0f0f]"></div>
        
        {/* Play button */}
        <button 
          onClick={handlePlayClick}
          disabled={isInitializing}
          className={`w-8 h-8 p-2 bg-[#e7e7e7] dark:bg-[#222222] flex items-center justify-center ${isInitializing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e2e2e2] dark:hover:bg-[#2a2a2a] cursor-pointer'}`}
        >
          <Play size={16} className="text-[#686868] dark:text-[#a7a7a7] fill-[#686868] dark:fill-[#a7a7a7]" />
        </button>
        
        {/* Second divider */}
        <div className="w-px h-8 bg-[#f0f0f0] dark:bg-[#0f0f0f]"></div>
        
        {/* Hint/Next button */}
        <div className="relative">
          <button 
            className={`h-8 bg-[#e7e7e7] dark:bg-[#222222] hover:bg-[#e2e2e2] dark:hover:bg-[#2a2a2a] rounded-r-sm flex items-center gap-1 transition-all duration-200 ${showStatusBar || isDebugMode ? 'px-2' : 'px-3'} ${hasWon ? 'cursor-pointer' : ''}`}
            onMouseEnter={() => !hasWon && setShowHintCard(true)}
            onMouseLeave={() => setShowHintCard(false)}
            onClick={hasWon ? handleNextClick : undefined}
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
              className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 rounded-lg shadow-lg z-50 pointer-events-none transition-opacity duration-150 bg-white dark:bg-[#3c3c3c] ${
                showHintCard ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                paddingLeft: '12px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px'
              }}
            >
              <p className="text-[#262626] dark:text-[#ffffff]" style={{ 
                fontSize: '14px', 
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