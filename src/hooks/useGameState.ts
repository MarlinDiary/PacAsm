import { useState, useCallback } from 'react'
import { GameMap, getPlayerPosition } from '@/data/maps'

export interface GameState {
  // Mode states
  isDebugMode: boolean
  isPlayMode: boolean
  isCodeDisabled: boolean
  playStatus: 'running' | undefined
  
  // Victory states  
  hasWon: boolean // Ever won (permanent)
  currentPlayWon: boolean // This play won (temporary)
  
  // Code and map states
  currentCode: string
  currentMap: GameMap
  highlightedLine: number | undefined
  
  // Panel states
  rightPanelTab: number
  memorySearchQuery: string
  hideZeroRows: boolean
  isFullscreen: boolean
}

export const useGameState = (initialMap: GameMap, initialCode: string = '') => {
  // Mode states
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isPlayMode, setIsPlayMode] = useState(false)
  const [isCodeDisabled, setIsCodeDisabled] = useState(false)
  const [playStatus, setPlayStatus] = useState<'running' | undefined>(undefined)
  
  // Victory states
  const [hasWon, setHasWon] = useState(false)
  const [currentPlayWon, setCurrentPlayWon] = useState(false)
  
  // Code and map states
  const [currentCode, setCurrentCode] = useState(initialCode)
  const [currentMap, setCurrentMap] = useState(initialMap)
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined)
  
  // Panel states
  const [rightPanelTab, setRightPanelTab] = useState(0)
  const [memorySearchQuery, setMemorySearchQuery] = useState('')
  const [hideZeroRows, setHideZeroRows] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Helper function to teleport player with animation
  const teleportPlayer = useCallback((targetMap: GameMap, currentPlayerPos?: { row: number; col: number; direction: string } | null) => {
    const targetPlayerPos = getPlayerPosition(targetMap)
    
    if (!targetPlayerPos) {
      setCurrentMap(targetMap)
      return
    }

    // Check if position is actually changing
    const isPositionChanging = currentPlayerPos && (
      currentPlayerPos.row !== targetPlayerPos.row ||
      currentPlayerPos.col !== targetPlayerPos.col
    )

    if (!isPositionChanging) {
      setCurrentMap(targetMap)
      return
    }

    // Start fade out at current position
    if (currentPlayerPos) {
      setCurrentMap({
        ...currentMap,
        playerAnimation: {
          direction: (currentPlayerPos.direction as any) || 'right',
          teleportAnimation: 'fade-out'
        }
      })

      // After fade out, move to new position and fade in
      setTimeout(() => {
        setCurrentMap({
          ...targetMap,
          playerAnimation: {
            direction: targetPlayerPos.direction,
            teleportAnimation: 'fade-in'
          }
        })

        // Remove animation after fade in
        setTimeout(() => {
          setCurrentMap(targetMap)
        }, 150)
      }, 150)
    } else {
      setCurrentMap(targetMap)
    }
  }, [currentMap])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const resetGameState = useCallback(() => {
    setIsDebugMode(false)
    setIsPlayMode(false)
    setIsCodeDisabled(false)
    setPlayStatus(undefined)
    setCurrentPlayWon(false)
    setHighlightedLine(undefined)
    
    const currentPlayerPos = getPlayerPosition(currentMap)
    teleportPlayer(initialMap, currentPlayerPos)
  }, [initialMap, currentMap, teleportPlayer])

  return {
    // States
    isDebugMode,
    isPlayMode,
    isCodeDisabled,
    playStatus,
    hasWon,
    currentPlayWon,
    currentCode,
    currentMap,
    highlightedLine,
    rightPanelTab,
    memorySearchQuery,
    hideZeroRows,
    isFullscreen,
    
    // Setters
    setIsDebugMode,
    setIsPlayMode,
    setIsCodeDisabled,
    setPlayStatus,
    setHasWon,
    setCurrentPlayWon,
    setCurrentCode,
    setCurrentMap,
    setHighlightedLine,
    setRightPanelTab,
    setMemorySearchQuery,
    setHideZeroRows,
    
    // Helper functions
    teleportPlayer,
    toggleFullscreen,
    resetGameState
  }
}