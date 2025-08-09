import { useState, useRef, useCallback } from 'react'
import { useEmulator } from './useEmulator'
import { GameMap } from '@/data/maps'
import { CodeHighlighter, createHighlighterWithCompiledCode, getHighlightFromStepResult } from '@/lib/highlighter'
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

export const useDebugger = () => {
  const emulator = useEmulator()
  const addError = useDiagnosticsStore((state) => state.addError)
  const [highlighter, setHighlighter] = useState<CodeHighlighter | null>(null)
  const [executionHistory, setExecutionHistory] = useState<PlaybackState[]>([])
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState(-1)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isLazyDebugMode, setIsLazyDebugMode] = useState(false)
  const [hasShownEnd, setHasShownEnd] = useState(false)
  const [hasError, setHasError] = useState(false)
  const currentCodeRef = useRef<string>('')

  // Standard debug mode - pre-execute all steps
  const startDebug = async (sourceCode: string, currentMap: GameMap) => {
    // Store the source code for error reporting
    currentCodeRef.current = sourceCode
    
    // Abort any previous initialization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this initialization
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Clear previous state immediately
    setExecutionHistory([])
    setCurrentPlaybackIndex(-1)
    setHighlighter(null)
    
    try {
      if (abortController.signal.aborted) {
        return { success: false, error: 'INIT_ERROR: Operation aborted' }
      }
      
      if (!emulator.state.isInitialized) {
        await emulator.initializeEmulator()
      }
      
      // Always reset emulator before loading new code
      await emulator.reset()
      
      const assembler = new ARMAssembler()
      await assembler.initialize()
      const result = await assembler.assemble(sourceCode)
      
      // Clear code memory region before loading new code
      const codeMemorySize = 1024 // Same size as we read later
      const zeroData = new Array(codeMemorySize).fill(0)
      await emulator.writeMemory(0x10000, zeroData)
      
      await emulator.loadCode(Array.from(result.mc))
      
      // Create highlighter using the already compiled machine code
      const codeHighlighter = await createHighlighterWithCompiledCode(sourceCode, result.mc)
      setHighlighter(codeHighlighter)
      
      const history: PlaybackState[] = []
      let currentMapState = { ...currentMap }
      let currentHighlight: number | undefined = undefined
      
      // Record initial state before any execution
      const initialRegisters = await emulator.getAllRegisters()
      const initialCodeMemory = await emulator.getMemory(0x10000, 1024)
      const initialStackMemory = await emulator.getMemory(0x20000, 1024)
      const initialDataMemory = await emulator.getMemory(0x30000, 1024)
      
      if (initialRegisters && initialCodeMemory && initialStackMemory && initialDataMemory) {
        history.push({
          mapState: currentMapState,
          highlightedLine: currentHighlight,
          registers: initialRegisters,
          codeMemory: initialCodeMemory.data,
          stackMemory: initialStackMemory.data,
          dataMemory: initialDataMemory.data,
          stepResult: null
        })
      }
      
      while (true) {
        if (abortController.signal.aborted) {
          return { success: false, error: 'INIT_ERROR: Operation aborted' }
        }
        
        const stepResult = await emulator.step()
        if (!stepResult) {
          return { success: false, error: 'RUNTIME_ERROR: Step execution failed' }
        }
        
        if (!stepResult.success) {
          return { success: false, error: 'RUNTIME_ERROR: Execution failed' }
        }
        
        if (stepResult.message?.includes('Execution completed') ||
            stepResult.message?.includes('reached end of code') ||
            stepResult.message?.includes('no more instructions')) {
          break
        }
        
        const highlight = getHighlightFromStepResult(stepResult, codeHighlighter)
        currentHighlight = highlight?.lineNumber
        
        const registers = await emulator.getAllRegisters()
        const codeMemory = await emulator.getMemory(0x10000, 1024)
        const stackMemory = await emulator.getMemory(0x20000, 1024)
        const dataMemory = await emulator.getMemory(0x30000, 1024)
        
        // Handle game commands using data memory
        if (dataMemory) {
          const commandValue = dataMemory.data[0]
          if (commandValue >= 1 && commandValue <= 4 && currentMapState.playerPosition) {
            let newRow = currentMapState.playerPosition.row
            let newCol = currentMapState.playerPosition.col
            let newDirection = currentMapState.playerPosition.direction
            
            switch (commandValue) {
              case 1: newRow = Math.max(0, newRow - 1); newDirection = 'up'; break
              case 2: newRow = Math.min(currentMapState.height - 1, newRow + 1); newDirection = 'down'; break
              case 3: newCol = Math.max(0, newCol - 1); newDirection = 'left'; break
              case 4: newCol = Math.min(currentMapState.width - 1, newCol + 1); newDirection = 'right'; break
            }
            
            const updatedDots = currentMapState.dots ? [...currentMapState.dots] : []
            const dotIndex = updatedDots.findIndex(dot => dot.row === newRow && dot.col === newCol)
            if (dotIndex !== -1) {
              updatedDots.splice(dotIndex, 1)
            }
            
            currentMapState = {
              ...currentMapState,
              playerPosition: { ...currentMapState.playerPosition, row: newRow, col: newCol, direction: newDirection },
              dots: updatedDots
            }
            
            await emulator.writeMemory(0x30000, [0])
          }
        }
        
        if (registers && codeMemory && stackMemory && dataMemory) {
          history.push({
            mapState: { ...currentMapState },
            highlightedLine: currentHighlight,
            registers,
            codeMemory: codeMemory.data,
            stackMemory: stackMemory.data,
            dataMemory: dataMemory.data,
            stepResult
          })
        }
      }
      
      setExecutionHistory(history)
      setCurrentPlaybackIndex(0)
      assembler.destroy()
      
      return { success: true, initialState: history[0] }
    } catch (error) {
      // Silently handle - error already added to diagnostics
      addError('INIT_ERROR: Failed to initialize debugger', currentCodeRef.current)
      return { success: false, error }
    }
  }

  // Lazy initialization for debug mode - only prepare emulator without pre-execution
  const startDebugLazy = async (sourceCode: string, currentMap: GameMap) => {
    // Store the source code for error reporting
    currentCodeRef.current = sourceCode
    // Abort any previous initialization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this initialization
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Clear previous state immediately
    setExecutionHistory([])
    setCurrentPlaybackIndex(-1)
    setHighlighter(null)
    setIsLazyDebugMode(true)
    setHasShownEnd(false)
    
    try {
      if (abortController.signal.aborted) {
        return { success: false, error: 'INIT_ERROR: Operation aborted' }
      }
      
      if (!emulator.state.isInitialized) {
        await emulator.initializeEmulator()
      }
      
      // Always reset emulator before loading new code
      await emulator.reset()
      
      const assembler = new ARMAssembler()
      await assembler.initialize()
      const result = await assembler.assemble(sourceCode)
      
      // Clear code memory region before loading new code
      const codeMemorySize = 1024
      const zeroData = new Array(codeMemorySize).fill(0)
      await emulator.writeMemory(0x10000, zeroData)
      
      await emulator.loadCode(Array.from(result.mc))
      
      // Create highlighter using the already compiled machine code
      const codeHighlighter = await createHighlighterWithCompiledCode(sourceCode, result.mc)
      
      // Record initial state before any execution
      const initialRegisters = await emulator.getAllRegisters()
      const initialCodeMemory = await emulator.getMemory(0x10000, 1024)
      const initialStackMemory = await emulator.getMemory(0x20000, 1024)
      const initialDataMemory = await emulator.getMemory(0x30000, 1024)
      
      assembler.destroy()
      
      // Only check abort signal right before updating state
      if (abortController.signal.aborted) {
        return { success: false, error: 'INIT_ERROR: Operation aborted' }
      }
      
      const history: PlaybackState[] = []
      if (initialRegisters && initialCodeMemory && initialStackMemory && initialDataMemory) {
        history.push({
          mapState: { ...currentMap },
          highlightedLine: undefined,
          registers: initialRegisters,
          codeMemory: initialCodeMemory.data,
          stackMemory: initialStackMemory.data,
          dataMemory: initialDataMemory.data,
          stepResult: null
        })
      }
      
      setHighlighter(codeHighlighter)
      setExecutionHistory(history)
      setCurrentPlaybackIndex(0)
      
      return { success: true, initialState: history[0] }
    } catch (error) {
      // Silently handle - error already added to diagnostics
      addError('INIT_ERROR: Failed to initialize debugger', currentCodeRef.current)
      return { success: false, error }
    }
  }

  // Execute one step on demand and record it
  const stepDownLazy = async () => {
    // First check if we can move forward in existing history
    if (currentPlaybackIndex < executionHistory.length - 1) {
      // We have history, just move forward in it (like regular stepDown)
      const nextIndex = currentPlaybackIndex + 1
      setCurrentPlaybackIndex(nextIndex)
      return executionHistory[nextIndex]
    }
    
    // If we've already shown the end state, don't allow further steps
    if (hasShownEnd) {
      return null
    }
    
    // We're at the end of current history and need to execute a new step
    if (executionHistory.length > 0) {
      // Need to execute a new step
      const currentState = executionHistory[currentPlaybackIndex]
      
      try {
        const stepResult = await emulator.step()
        if (!stepResult) {
          return null
        }
        
        if (!stepResult.success) {
          // Silently handle - error already added to diagnostics
          setHasError(true)
          addError('RUNTIME_ERROR: Step execution failed', currentCodeRef.current)
          return null
        }
        
        if (stepResult.message?.includes('Execution completed') ||
            stepResult.message?.includes('reached end of code') ||
            stepResult.message?.includes('no more instructions')) {
          // Still record this final state to show the end result
          const registers = await emulator.getAllRegisters()
          const codeMemory = await emulator.getMemory(0x10000, 1024)
          const stackMemory = await emulator.getMemory(0x20000, 1024)
          const dataMemory = await emulator.getMemory(0x30000, 1024)
          
          if (registers && codeMemory && stackMemory && dataMemory) {
            const endState: PlaybackState = {
              mapState: currentState.mapState,
              highlightedLine: undefined, // No line to highlight at the end
              registers,
              codeMemory: codeMemory.data,
              stackMemory: stackMemory.data,
              dataMemory: dataMemory.data,
              stepResult
            }
            
            const newHistory = [...executionHistory, endState]
            setExecutionHistory(newHistory)
            setCurrentPlaybackIndex(currentPlaybackIndex + 1)
            setHasShownEnd(true) // Mark that we've shown the end state
            
            return endState
          }
          return null
        }
        
        const highlight = highlighter ? getHighlightFromStepResult(stepResult, highlighter) : null
        const currentHighlight = highlight?.lineNumber
        
        const registers = await emulator.getAllRegisters()
        const codeMemory = await emulator.getMemory(0x10000, 1024)
        const stackMemory = await emulator.getMemory(0x20000, 1024)
        const dataMemory = await emulator.getMemory(0x30000, 1024)
        
        let newMapState = { ...currentState.mapState }
        
        // Handle game commands using data memory
        if (dataMemory) {
          const commandValue = dataMemory.data[0]
          if (commandValue >= 1 && commandValue <= 4 && newMapState.playerPosition) {
            let newRow = newMapState.playerPosition.row
            let newCol = newMapState.playerPosition.col
            let newDirection = newMapState.playerPosition.direction
            
            switch (commandValue) {
              case 1: newRow = Math.max(0, newRow - 1); newDirection = 'up'; break
              case 2: newRow = Math.min(newMapState.height - 1, newRow + 1); newDirection = 'down'; break
              case 3: newCol = Math.max(0, newCol - 1); newDirection = 'left'; break
              case 4: newCol = Math.min(newMapState.width - 1, newCol + 1); newDirection = 'right'; break
            }
            
            const updatedDots = newMapState.dots ? [...newMapState.dots] : []
            const dotIndex = updatedDots.findIndex(dot => dot.row === newRow && dot.col === newCol)
            if (dotIndex !== -1) {
              updatedDots.splice(dotIndex, 1)
            }
            
            newMapState = {
              ...newMapState,
              playerPosition: { ...newMapState.playerPosition, row: newRow, col: newCol, direction: newDirection },
              dots: updatedDots
            }
            
            await emulator.writeMemory(0x30000, [0])
          }
        }
        
        if (registers && codeMemory && stackMemory && dataMemory) {
          const newState: PlaybackState = {
            mapState: newMapState,
            highlightedLine: currentHighlight,
            registers,
            codeMemory: codeMemory.data,
            stackMemory: stackMemory.data,
            dataMemory: dataMemory.data,
            stepResult
          }
          
          const newHistory = [...executionHistory, newState]
          setExecutionHistory(newHistory)
          setCurrentPlaybackIndex(currentPlaybackIndex + 1)
          
          return newState
        }
      } catch (error) {
        // Silently handle - error already added to diagnostics
        setHasError(true)
        addError('RUNTIME_ERROR: Step execution failed', currentCodeRef.current)
        return null
      }
    }
    
    return null
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
    // Abort any ongoing initialization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Clear all state immediately - order matters!
    // First clear the index to ensure getCurrentState returns null
    setCurrentPlaybackIndex(-1)
    // Then clear the history
    setExecutionHistory([])
    setHighlighter(null)
    setIsLazyDebugMode(false)
    setHasShownEnd(false)
    setHasError(false)
    
    try {
      await emulator.reset()
    } catch (error) {
      // Silently handle reset failure
    }
  }, [emulator])

  const getCurrentState = () => {
    // Return null immediately if we're resetting or no history
    if (executionHistory.length === 0 || currentPlaybackIndex < 0) {
      return null
    }
    if (currentPlaybackIndex < executionHistory.length) {
      return executionHistory[currentPlaybackIndex]
    }
    return null
  }

  const getPreviousState = () => {
    // Return null immediately if we're resetting or no history
    if (executionHistory.length === 0 || currentPlaybackIndex <= 0) {
      return null
    }
    if (currentPlaybackIndex < executionHistory.length) {
      return executionHistory[currentPlaybackIndex - 1]
    }
    return null
  }

  return {
    highlighter,
    executionHistory,
    currentPlaybackIndex,
    hasError,
    canStepUp: currentPlaybackIndex > 0,
    canStepDown: isLazyDebugMode ? 
      (currentPlaybackIndex < executionHistory.length - 1 || !hasShownEnd) : 
      (currentPlaybackIndex < executionHistory.length - 1),
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