import { useState, useRef, useCallback } from 'react'
import { useEmulator } from './useEmulator'
import { GameMap } from '@/data/maps'
import { CodeHighlighter, createHighlighter, getHighlightFromStepResult } from '@/lib/highlighter'
import { ARMAssembler } from '@/lib/assembler'
import { RegisterInfo, StepResult } from '@/workers/emulator/types'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { checkVictoryCondition } from '@/lib/game-logic'
import { updateMapWithMovement, ensurePlayerAnimation } from '@/lib/game-animation'

export interface PlaybackState {
  mapState: GameMap
  highlightedLine: number | undefined
  registers: RegisterInfo[]
  codeMemory: number[]
  stackMemory: number[]
  dataMemory: number[]
  stepResult: StepResult | null
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
  const [hasReachedEnd, setHasReachedEnd] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isGameComplete, setIsGameComplete] = useState(false)
  const currentCodeRef = useRef<string>('')
  const originalCodeMemoryRef = useRef<number[]>([])
  const [isInitializing, setIsInitializing] = useState(false)

  // Common initialization logic
  const initializeEmulatorAndAssembler = async (sourceCode: string, abortController: AbortController) => {
    if (!emulator.state.isInitialized) {
      await emulator.initializeEmulator()
    }
    
    await emulator.reset()
    
    const assembler = new ARMAssembler()
    await assembler.initialize()
    const result = await assembler.assemble(sourceCode)
    
    // Initialize memory regions
    const memorySize = 1024
    const zeroData = new Array(memorySize).fill(0)
    await emulator.writeMemory(0x10000, zeroData) // Code memory
    await emulator.writeMemory(0x20000, zeroData) // Stack memory  
    await emulator.writeMemory(0x30000, zeroData) // Data memory
    
    await emulator.loadCode(Array.from(result.mc))
    
    // Save original code memory for reloading in cycles
    originalCodeMemoryRef.current = Array.from(result.mc)
    
    const codeHighlighter = createHighlighter()
    await codeHighlighter.initialize(sourceCode)
    
    assembler.destroy()
    
    if (abortController.signal.aborted) {
      return codeHighlighter
    }
    
    return codeHighlighter
  }

  // Get current memory state
  const getMemoryState = async (): Promise<MemoryState | null> => {
    const registers = await emulator.getAllRegisters()
    const codeMemory = await emulator.getMemory(0x10000, 1024)
    const stackMemory = await emulator.getMemory(0x20000, 1024)
    const dataMemory = await emulator.getMemory(0x30000, 1024)
    
    if (registers && codeMemory && stackMemory && dataMemory) {
      return {
        registers,
        codeMemory: codeMemory.data,
        stackMemory: stackMemory.data,
        dataMemory: dataMemory.data
      }
    }
    return null
  }

  // Handle player movement based on data memory
  const handlePlayerMovement = (currentMap: GameMap, dataMemory: number[]): GameMap => {
    const commandValue = dataMemory[0]
    if (commandValue < 1 || commandValue > 4) {
      return currentMap
    }
    return updateMapWithMovement(currentMap, commandValue)
  }

  // Check if execution has ended
  const isExecutionComplete = (stepResult: StepResult): boolean => {
    return stepResult.message?.includes('Execution completed') ||
           stepResult.message?.includes('reached end of code') ||
           stepResult.message?.includes('no more instructions') ||
           false
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
      const codeHighlighter = await initializeEmulatorAndAssembler(sourceCode, abortController)
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
      
      if (isExecutionComplete(stepResult)) {
        break
      }
      
      const highlight = getHighlightFromStepResult(stepResult, codeHighlighter)
      const memoryState = await getMemoryState()
      
      if (!memoryState) continue
      
      // Handle movement
      if (memoryState.dataMemory[0] >= 1 && memoryState.dataMemory[0] <= 4) {
        currentMapState = updateMapWithMovement(currentMapState, memoryState.dataMemory[0])
        await emulator.writeMemory(0x30000, [0])
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
      
      if (isExecutionComplete(stepResult)) {
        isCodeComplete = true
        setHasReachedEnd(true)
        
        // Only check for movement when code execution is complete
        const memoryState = await getMemoryState()
        if (memoryState && memoryState.dataMemory[0] >= 1 && memoryState.dataMemory[0] <= 4) {
          newMapState = updateMapWithMovement(newMapState, memoryState.dataMemory[0])
        }
        
        // Check if game is complete (all dots collected)
        if (checkVictoryCondition(newMapState)) {
          setIsGameComplete(true)
        } else {
          // Reset emulator for next cycle
          await emulator.reset()
          
          // Initialize memory regions for next cycle
          const memorySize = 1024
          const zeroData = new Array(memorySize).fill(0)
          await emulator.writeMemory(0x10000, zeroData) // Code memory
          await emulator.writeMemory(0x20000, zeroData) // Stack memory  
          await emulator.writeMemory(0x30000, zeroData) // Data memory
          
          // Reload original code
          await emulator.loadCode(originalCodeMemoryRef.current)
        }
        
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