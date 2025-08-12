import { useState, useRef, useCallback } from 'react'
import { useEmulator } from './useEmulator'
import { GameMap } from '@/data/maps'
import { CodeHighlighter, createHighlighter, getHighlightFromStepResult } from '@/lib/highlighter'
import { ARMAssembler } from '@/lib/assembler'
import { RegisterInfo, StepResult } from '@/workers/emulator/types'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'

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
  const currentCodeRef = useRef<string>('')

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
    
    const codeHighlighter = createHighlighter()
    await codeHighlighter.initialize(sourceCode)
    
    assembler.destroy()
    
    if (abortController.signal.aborted) {
      throw new Error('Operation Aborted')
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
  const updateMapWithMovement = (currentMap: GameMap, dataMemory: number[]): GameMap => {
    const commandValue = dataMemory[0]
    if (commandValue < 1 || commandValue > 4 || !currentMap.playerPosition) {
      return currentMap
    }
    
    const { row, col } = currentMap.playerPosition
    let newRow = row
    let newCol = col
    let newDirection = currentMap.playerPosition.direction
    
    switch (commandValue) {
      case 1: newRow = Math.max(0, row - 1); newDirection = 'up'; break
      case 2: newRow = Math.min(currentMap.height - 1, row + 1); newDirection = 'down'; break
      case 3: newCol = Math.max(0, col - 1); newDirection = 'left'; break
      case 4: newCol = Math.min(currentMap.width - 1, col + 1); newDirection = 'right'; break
    }
    
    const updatedDots = currentMap.dots ? [...currentMap.dots] : []
    const dotIndex = updatedDots.findIndex(dot => dot.row === newRow && dot.col === newCol)
    if (dotIndex !== -1) {
      updatedDots.splice(dotIndex, 1)
    }
    
    return {
      ...currentMap,
      playerPosition: { 
        ...currentMap.playerPosition, 
        row: newRow, 
        col: newCol, 
        direction: newDirection, 
        shouldAnimate: true 
      },
      dots: updatedDots
    }
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
    currentCodeRef.current = sourceCode
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Reset state
    setExecutionHistory([])
    setCurrentPlaybackIndex(-1)
    setHighlighter(null)
    setIsLazyMode(lazy)
    setHasReachedEnd(false)
    setHasError(false)
    
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
      
      setHighlighter(codeHighlighter)
      
      if (lazy) {
        // Lazy mode: only set initial state
        setExecutionHistory([initialState])
        setCurrentPlaybackIndex(0)
        return { success: true, initialState }
      } else {
        // Standard mode: pre-execute all steps
        const fullHistory = await executeAllSteps(codeHighlighter, initialState, abortController)
        setExecutionHistory(fullHistory)
        setCurrentPlaybackIndex(0)
        return { success: true, initialState: fullHistory[0] }
      }
    } catch (error) {
      addError('INIT_ERROR: Failed to Initialize Debugger', currentCodeRef.current)
      return { success: false, error }
    }
  }

  // Pre-execute all steps for standard debug mode
  const executeAllSteps = async (codeHighlighter: CodeHighlighter, initialState: PlaybackState, abortController: AbortController): Promise<PlaybackState[]> => {
    const history: PlaybackState[] = [initialState]
    let currentMapState = { ...initialState.mapState }
    
    while (true) {
      if (abortController.signal.aborted) {
        throw new Error('Operation Aborted')
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
        currentMapState = updateMapWithMovement(currentMapState, memoryState.dataMemory)
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

  // Execute one step on demand for lazy mode
  const stepDownLazy = async () => {
    // First check if we can move forward in existing history
    if (currentPlaybackIndex < executionHistory.length - 1) {
      const nextIndex = currentPlaybackIndex + 1
      setCurrentPlaybackIndex(nextIndex)
      return executionHistory[nextIndex]
    }
    
    // If we've reached the end, don't allow further steps
    if (hasReachedEnd) {
      return null
    }
    
    // Execute a new step
    try {
      const stepResult = await emulator.step()
      if (!stepResult || !stepResult.success) {
        setHasError(true)
        addError('RUNTIME_ERROR: Step Execution Failed', currentCodeRef.current)
        return null
      }
      
      const currentState = executionHistory[currentPlaybackIndex]
      let newMapState = { ...currentState.mapState }
      let currentHighlight: number | undefined = undefined
      
      if (isExecutionComplete(stepResult)) {
        setHasReachedEnd(true)
      } else {
        const highlight = highlighter ? getHighlightFromStepResult(stepResult, highlighter) : null
        currentHighlight = highlight?.lineNumber
      }
      
      const memoryState = await getMemoryState()
      if (!memoryState) return null
      
      // Handle movement
      if (memoryState.dataMemory[0] >= 1 && memoryState.dataMemory[0] <= 4) {
        newMapState = updateMapWithMovement(newMapState, memoryState.dataMemory)
        await emulator.writeMemory(0x30000, [0])
      }
      
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
    } catch (error) {
      setHasError(true)
      addError('RUNTIME_ERROR: Step execution failed', currentCodeRef.current)
      return null
    }
  }

  const stepDown = () => {
    if (currentPlaybackIndex < executionHistory.length - 1) {
      const nextIndex = currentPlaybackIndex + 1
      setCurrentPlaybackIndex(nextIndex)
      return executionHistory[nextIndex]
    }
    return null
  }

  const stepUp = () => {
    if (currentPlaybackIndex > 0) {
      const prevIndex = currentPlaybackIndex - 1
      setCurrentPlaybackIndex(prevIndex)
      return executionHistory[prevIndex]
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
    
    try {
      await emulator.reset()
    } catch (error) {}
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
    canStepUp: currentPlaybackIndex > 0,
    canStepDown: emulator.state.isInitialized && (
      isLazyMode ? 
        (currentPlaybackIndex < executionHistory.length - 1 || !hasReachedEnd) :
        (currentPlaybackIndex < executionHistory.length - 1)
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