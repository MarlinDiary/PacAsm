import { useCallback, useEffect } from 'react'
import { GameMap } from '@/data/maps'
import { useDebugger } from './useDebugger'
import { usePlayRunner } from './usePlayRunner'
import { useGameState } from './useGameState'
import { handleVictoryCheck } from '@/lib/game-logic'

interface UseExecutionControlProps {
  gameState: ReturnType<typeof useGameState>
  levelMap: GameMap
}

export const useExecutionControl = ({ gameState, levelMap }: UseExecutionControlProps) => {
  const debugState = useDebugger()
  const playState = usePlayRunner()

  const {
    currentCode,
    setIsCodeDisabled,
    setIsDebugMode,
    setIsPlayMode,
    setPlayStatus,
    setHasWon,
    setCurrentPlayWon,
    setHighlightedLine,
    setCurrentMap,
    teleportPlayer,
    isPlayMode,
    isDebugMode
  } = gameState

  const handlePlayClick = useCallback(async () => {
    // Reset map to initial state before starting play with teleport animation
    teleportPlayer(levelMap, gameState.currentMap.playerPosition)
    setHighlightedLine(undefined)
    setCurrentPlayWon(false) // Reset current play victory status
    // Don't clear hasWon - keep Next button permanently after first victory
    
    setIsCodeDisabled(true)
    setIsPlayMode(true)
    setPlayStatus('running') // Show "Running..." immediately
    
    const result = await playState.startPlay(currentCode, levelMap)
    if (!result.success && result.error) {
      // Handle error - reset UI state
      setIsCodeDisabled(false)
      setIsPlayMode(false)
      setPlayStatus(undefined)
      // Play failure already handled by diagnostics
    } else if (!result.success && !result.error) {
      // User cancelled - reset UI state without error
      setIsCodeDisabled(false)
      setIsPlayMode(false)
      setPlayStatus(undefined)
    }
  }, [currentCode, levelMap, gameState.currentMap.playerPosition, teleportPlayer, setHighlightedLine, setCurrentPlayWon, setIsCodeDisabled, setIsPlayMode, setPlayStatus, playState])

  const handleDebugClick = useCallback(async () => {
    // Reset map to initial state before starting debug with teleport animation
    teleportPlayer(levelMap, gameState.currentMap.playerPosition)
    setHighlightedLine(undefined)
    // Don't clear hasWon - keep Next button permanently after first victory
    
    setIsDebugMode(true)
    setIsCodeDisabled(true)
    
    const result = await debugState.startDebugLazy(currentCode, levelMap) // Use lazy debug initialization
    if (result.success && result.initialState) {
      setCurrentMap(result.initialState.mapState)
      setHighlightedLine(result.initialState.highlightedLine)
    } else {
      // Handle error silently - just reset UI state
      setIsDebugMode(false)
      setIsCodeDisabled(false)
    }
  }, [currentCode, levelMap, gameState.currentMap.playerPosition, teleportPlayer, setHighlightedLine, setIsDebugMode, setIsCodeDisabled, setCurrentMap, debugState])

  const handleStepDown = useCallback(async () => {
    const nextState = await debugState.stepDownLazy()
    if (nextState) {
      // Enable animation for stepping
      const mapWithAnimation = {
        ...nextState.mapState,
        playerPosition: nextState.mapState.playerPosition ? {
          ...nextState.mapState.playerPosition,
          shouldAnimate: true
        } : undefined
      }
      setCurrentMap(mapWithAnimation)
      setHighlightedLine(nextState.highlightedLine)
    }
  }, [debugState, setCurrentMap, setHighlightedLine])

  const handleStepUp = useCallback(() => {
    const prevState = debugState.stepUp()
    if (prevState) {
      // Enable animation for stepping
      const mapWithAnimation = {
        ...prevState.mapState,
        playerPosition: prevState.mapState.playerPosition ? {
          ...prevState.mapState.playerPosition,
          shouldAnimate: true
        } : undefined
      }
      setCurrentMap(mapWithAnimation)
      setHighlightedLine(prevState.highlightedLine)
    }
  }, [debugState, setCurrentMap, setHighlightedLine])

  const handleStopClick = useCallback(async () => {
    setIsCodeDisabled(false)
    setIsDebugMode(false)
    setHighlightedLine(undefined)
    teleportPlayer(levelMap, gameState.currentMap.playerPosition) // Reset map with teleport animation
    
    // Reset states to clear panels
    await Promise.all([
      debugState.reset(),
      playState.reset()
    ])
  }, [setIsCodeDisabled, setIsDebugMode, setHighlightedLine, teleportPlayer, levelMap, gameState.currentMap.playerPosition, debugState, playState])

  const handleReplay = useCallback(() => {
    const firstState = debugState.replay()
    if (firstState) {
      // Teleport animation for replay
      teleportPlayer(firstState.mapState, gameState.currentMap.playerPosition)
      setHighlightedLine(firstState.highlightedLine)
    }
  }, [debugState, teleportPlayer, gameState.currentMap.playerPosition, setHighlightedLine])

  // Get current and previous debug states for panels
  // Only use play state when actively playing, otherwise use debug state
  const getCurrentState = useCallback(() => {
    if (playState.isPlaying) {
      return playState.getCurrentState()
    }
    return debugState.getCurrentState()
  }, [playState.isPlaying, playState, debugState])
  
  const currentDebugState = getCurrentState()
  const previousDebugState = playState.isPlaying ? playState.getPreviousState() : debugState.getPreviousState()

  // Listen for play state updates (only when actively playing)
  useEffect(() => {
    if (playState.isPlaying && playState.currentMap) {
      setCurrentMap(playState.currentMap)
      setHighlightedLine(playState.highlightedLine)
      
      // Check victory condition during play mode using game logic
      if (isPlayMode && playState.currentMap) {
        handleVictoryCheck(playState.currentMap, setHasWon, setCurrentPlayWon, isPlayMode)
      }
    }
  }, [playState.isPlaying, playState.currentMap, playState.highlightedLine, isPlayMode, setCurrentMap, setHighlightedLine, setHasWon, setCurrentPlayWon])

  // Listen for play completion
  useEffect(() => {
    if (isPlayMode && !playState.isPlaying && playState.movementActions.length >= 0) {
      // Play has finished - reset everything
      setTimeout(() => {
        setIsPlayMode(false)
        setIsCodeDisabled(false)
        setHighlightedLine(undefined)
        setPlayStatus(undefined) // Always reset play status
        // Keep Pacman at final position regardless of win/loss
        // Don't reset the map - keep the current state
        // Don't reset currentPlayWon here - let confetti play naturally
        // It will be reset when starting a new game
      }, 300) // Small delay to show final state briefly
    }
  }, [playState.isPlaying, isPlayMode, playState.movementActions.length, setIsPlayMode, setIsCodeDisabled, setHighlightedLine, setPlayStatus])

  // Auto-stop debug mode when error occurs
  useEffect(() => {
    if (debugState.hasError && isDebugMode) {
      handleStopClick()
    }
  }, [debugState.hasError, isDebugMode, handleStopClick])

  return {
    // Debug state
    debugState,
    playState,
    currentDebugState,
    previousDebugState,
    
    // Handler functions
    handlePlayClick,
    handleDebugClick,
    handleStepDown,
    handleStepUp,
    handleStopClick,
    handleReplay
  }
}