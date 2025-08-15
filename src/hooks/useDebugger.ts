import { useState, useRef, useCallback } from 'react'
import { useEmulator } from './useEmulator'
import { GameMap } from '@/data/maps'
import { CodeHighlighter, getHighlightFromStepResult } from '@/lib/highlighter'
import { RegisterInfo, StepResult } from '@/workers/emulator/types'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { updateMapWithMovement } from '@/lib/game-animation'
import { 
  initializeEmulatorWithCode, 
  getEmulatorMemoryState
} from '@/lib/emulator-utils'
import { 
  handleDebugCycleEnd, 
  clearMovementCommand, 
  isCodeExecutionComplete,
  hasValidMovementCommand 
} from '@/lib/cycle-management'

export interface PlaybackState {
  mapState: GameMap
  highlightedLine: number | undefined
  registers: RegisterInfo[]
  codeMemory: number[]
  stackMemory: number[]
  dataMemory: number[]
  stepResult: StepResult | null
  [key: string]: unknown
}

interface MemoryState {
  registers: RegisterInfo[]
  codeMemory: number[]
  stackMemory: number[]
  dataMemory: number[]
}

export const useDebugger = () => {
  const emulator = useEmulator()
  const addError = useDiagnosticsStore((state) => state.addError)
  const [highlighter, setHighlighter] = useState<CodeHighlighter | null>(null)
  const [executionHistory, setExecutionHistory] = useState<PlaybackState[]>([])
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState(-1)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isLazyMode, setIsLazyMode] = useState(false)
  const [, setHasReachedEnd] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isGameComplete, setIsGameComplete] = useState(false)
  const currentCodeRef = useRef<string>('')
  const originalCodeMemoryRef = useRef<number[]>([])
  const [isInitializing, setIsInitializing] = useState(false)


  // Get current memory state
  const getMemoryState = async (): Promise<MemoryState | null> => {
    return await getEmulatorMemoryState(emulator)
  }



  // Standard debug mode - pre-execute all steps
  const startDebug = async (sourceCode: string, currentMap: GameMap) => {
    return await initializeDebugger(sourceCode, currentMap, false)
  }

  // Lazy debug mode - only prepare emulator without pre-execution
  const startDebugLazy = async (sourceCode: string, currentMap: GameMap) => {
    return await initializeDebugger(sourceCode, currentMap, true)
  }

  // Common debugger initialization
  const initializeDebugger = async (sourceCode: string, currentMap: GameMap, lazy: boolean) => {
    // Cancel any existing initialization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Reset state immediately to clear panels
    setExecutionHistory([])
    setCurrentPlaybackIndex(-1)
    setHighlighter(null)
    setIsLazyMode(lazy)
    setHasReachedEnd(false)
    setHasError(false)
    setIsGameComplete(false)
    setIsInitializing(true)
    
    currentCodeRef.current = sourceCode
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    try {
      const { codeHighlighter, machineCode } = await initializeEmulatorWithCode(emulator, sourceCode, abortController)
      
      // Save original code memory for reloading in cycles
      originalCodeMemoryRef.current = machineCode
      
      const initialMemory = await getMemoryState()
      
      if (!initialMemory) {
        throw new Error('Failed to get initial memory state')
      }
      
      const initialState: PlaybackState = {
        mapState: { ...currentMap },
        highlightedLine: undefined,
        ...initialMemory,
        stepResult: null
      }
      
      // Check if operation was aborted before setting state
      if (abortController.signal.aborted) {
        setIsInitializing(false)
        return { success: false, error: null }
      }
      
      setHighlighter(codeHighlighter)
      
      if (lazy) {
        // Lazy mode: only set initial state
        setExecutionHistory([initialState])
        setCurrentPlaybackIndex(0)
        setIsInitializing(false)
        return { success: true, initialState }
      } else {
        // Standard mode: pre-execute all steps
        const fullHistory = await executeAllSteps(codeHighlighter, initialState, abortController)
        if (abortController.signal.aborted) {
          setIsInitializing(false)
          return { success: false, error: null }
        }
        setExecutionHistory(fullHistory)
        setCurrentPlaybackIndex(0)
        setIsInitializing(false)
        return { success: true, initialState: fullHistory[0] }
      }
    } catch (error) {
      setIsInitializing(false)
      const errorMessage = error instanceof Error ? error.message : String(error)
      addError(errorMessage, currentCodeRef.current)
      return { success: false, error: errorMessage }
    }
  }

  // Pre-execute all steps for standard debug mode
  const executeAllSteps = async (codeHighlighter: CodeHighlighter, initialState: PlaybackState, abortController: AbortController): Promise<PlaybackState[]> => {
    const history: PlaybackState[] = [initialState]
    let currentMapState = { ...initialState.mapState }
    
    while (true) {
      if (abortController.signal.aborted) {
        break
      }
      
      const stepResult = await emulator.step()
      if (!stepResult || !stepResult.success) {
        break
      }
      
      if (isCodeExecutionComplete(stepResult)) {
        break
      }
      
      const highlight = getHighlightFromStepResult(stepResult, codeHighlighter)
      const memoryState = await getMemoryState()
      
      if (!memoryState) continue
      
      // Handle movement
      if (hasValidMovementCommand(memoryState.dataMemory)) {
        currentMapState = updateMapWithMovement(currentMapState, memoryState.dataMemory[0])
        await clearMovementCommand(emulator)
      }
      
      history.push({
        mapState: { ...currentMapState },
        highlightedLine: highlight?.lineNumber,
        ...memoryState,
        stepResult
      })
    }
    
    return history
  }

  // Helper function to ensure animation state is added to a state
  const ensureAnimationState = (state: PlaybackState): PlaybackState => {
    return {
      ...state,
      mapState: {
        ...state.mapState,
        playerAnimation: {
          ...state.mapState.playerAnimation,
          direction: state.mapState.playerAnimation?.direction || 'right',
          shouldAnimate: true
        }
      }
    }
  }

  // Execute one step on demand for lazy mode
  const stepDownLazy = async () => {
    // Don't allow stepping during initialization
    if (isInitializing) {
      console.warn('[DEBUGGER] Cannot step while initializing')
      return null
    }
    
    // First check if we can move forward in existing history (always allowed)
    if (currentPlaybackIndex < executionHistory.length - 1) {
      const nextIndex = currentPlaybackIndex + 1
      setCurrentPlaybackIndex(nextIndex)
      return executionHistory[nextIndex]
    }
    
    // Don't allow NEW step execution if game is complete
    if (isGameComplete) {
      console.warn('[DEBUGGER] Game is complete, cannot execute new steps')
      return null
    }
    
    // Check if debugger is properly initialized for NEW step execution
    if (!highlighter || executionHistory.length === 0 || currentPlaybackIndex < 0) {
      console.error('[DEBUGGER] Debugger not properly initialized for step operation')
      addError('Debugger not ready for step operation', currentCodeRef.current)
      return null
    }
    
    // Execute a new step
    try {
      const stepResult = await emulator.step()
      if (!stepResult || !stepResult.success) {
        setHasError(true)
        const errorMessage = stepResult?.message || 'Step execution failed'
        addError(errorMessage, currentCodeRef.current)
        return null
      }
      
      const currentState = executionHistory[currentPlaybackIndex]
      let newMapState = { ...currentState.mapState }
      let currentHighlight: number | undefined = undefined
      let isCodeComplete = false
      
      if (isCodeExecutionComplete(stepResult)) {
        isCodeComplete = true
        setHasReachedEnd(true)
        
        // Handle cycle end using common logic
        const cycleResult = await handleDebugCycleEnd(
          emulator, 
          newMapState, 
          originalCodeMemoryRef.current, 
          setIsGameComplete
        )
        newMapState = cycleResult.newMapState
        
        // Get actual emulator state after reset to show in panels
        const resetMemoryState = await getMemoryState()
        const resetState: PlaybackState = {
          mapState: newMapState,
          highlightedLine: undefined,
          registers: resetMemoryState?.registers || [], // Show actual reset state
          codeMemory: resetMemoryState?.codeMemory || [], // Show actual reset state
          stackMemory: resetMemoryState?.stackMemory || [], 
          dataMemory: resetMemoryState?.dataMemory || [],
          stepResult
        }
        
        const newHistory = [...executionHistory, resetState]
        setExecutionHistory(newHistory)
        setCurrentPlaybackIndex(currentPlaybackIndex + 1)
        
        // If code execution is complete, allow continuing to next cycle
        if (isCodeComplete) {
          setHasReachedEnd(false)
        }
        
        return resetState
      } else {
        const highlight = highlighter ? getHighlightFromStepResult(stepResult, highlighter) : null
        currentHighlight = highlight?.lineNumber
        
        const memoryState = await getMemoryState()
        if (!memoryState) return null
        
        const newState: PlaybackState = {
          mapState: newMapState,
          highlightedLine: currentHighlight,
          ...memoryState,
          stepResult
        }
        
        const newHistory = [...executionHistory, newState]
        setExecutionHistory(newHistory)
        setCurrentPlaybackIndex(currentPlaybackIndex + 1)
        
        return newState
      }
    } catch (error) {
      setHasError(true)
      const errorMessage = error instanceof Error ? error.message : String(error)
      addError(errorMessage, currentCodeRef.current)
      return null
    }
  }

  const stepDown = () => {
    if (currentPlaybackIndex < executionHistory.length - 1) {
      const nextIndex = currentPlaybackIndex + 1
      setCurrentPlaybackIndex(nextIndex)
      return ensureAnimationState(executionHistory[nextIndex])
    }
    return null
  }

  const stepUp = () => {
    if (currentPlaybackIndex > 0) {
      const prevIndex = currentPlaybackIndex - 1
      setCurrentPlaybackIndex(prevIndex)
      // Reset error state when stepping back, allowing forward stepping again
      if (hasError) {
        setHasError(false)
      }
      return ensureAnimationState(executionHistory[prevIndex])
    }
    return null
  }

  const replay = () => {
    if (executionHistory.length > 0) {
      setCurrentPlaybackIndex(0)
      return executionHistory[0]
    }
    return null
  }

  const reset = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Clear state
    setCurrentPlaybackIndex(-1)
    setExecutionHistory([])
    setHighlighter(null)
    setIsLazyMode(false)
    setHasReachedEnd(false)
    setHasError(false)
    setIsGameComplete(false)
    setIsInitializing(false)
    
    try {
      await emulator.reset()
    } catch {
      // Silently handle reset failure
    }
  }, [emulator])

  const getCurrentState = () => {
    if (executionHistory.length === 0 || currentPlaybackIndex < 0 || currentPlaybackIndex >= executionHistory.length) {
      return null
    }
    return executionHistory[currentPlaybackIndex]
  }

  const getPreviousState = () => {
    if (executionHistory.length === 0 || currentPlaybackIndex <= 0) {
      return null
    }
    return executionHistory[currentPlaybackIndex - 1]
  }

  return {
    highlighter,
    executionHistory,
    currentPlaybackIndex,
    hasError,
    isInitializing,
    canStepUp: currentPlaybackIndex > 0 && !isInitializing,
    canStepDown: !isInitializing && emulator.state.isInitialized && !hasError && (
      isLazyMode ? 
        (currentPlaybackIndex < executionHistory.length - 1 || !isGameComplete) : // In lazy mode, allow if in history OR if game not complete
        (!isGameComplete && currentPlaybackIndex < executionHistory.length - 1)
    ),
    startDebug,
    startDebugLazy,
    stepDown,
    stepDownLazy,
    stepUp,
    replay,
    reset,
    getCurrentState,
    getPreviousState
  }
}