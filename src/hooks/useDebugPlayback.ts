import { useState, useRef, useCallback } from 'react'
import { useEmulator } from './useEmulator'
import { GameMap } from '@/data/maps'
import { CodeHighlighter, createHighlighterWithCompiledCode, getHighlightFromStepResult } from '@/lib/highlighter'
import { ARMAssembler } from '@/lib/assembler'
import { RegisterInfo, StepResult } from '@/workers/emulator/types'

interface PlaybackState {
  mapState: GameMap
  highlightedLine: number | undefined
  registers: RegisterInfo[]
  codeMemory: number[]
  stackMemory: number[]
  dataMemory: number[]
  stepResult: StepResult | null
}

export const useDebugPlayback = (_initialMap: GameMap) => {
  const emulator = useEmulator()
  const [highlighter, setHighlighter] = useState<CodeHighlighter | null>(null)
  const [executionHistory, setExecutionHistory] = useState<PlaybackState[]>([])
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState(-1)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startDebug = async (sourceCode: string, currentMap: GameMap) => {
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
        return { success: false, error: 'Aborted' }
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
          return { success: false, error: 'Aborted' }
        }
        
        const stepResult = await emulator.step()
        if (!stepResult || !stepResult.success || 
            stepResult.message?.includes('Execution completed') ||
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
      console.error('Debug initialization failed:', error)
      return { success: false, error }
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

  const reset = async () => {
    // Stop any ongoing playback
    stopPlay()
    
    // Abort any ongoing initialization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Clear all state immediately
    setExecutionHistory([])
    setCurrentPlaybackIndex(-1)
    setHighlighter(null)
    
    try {
      await emulator.reset()
    } catch (error) {
      console.error('Reset failed:', error)
    }
  }

  const replay = () => {
    if (executionHistory.length > 0) {
      setCurrentPlaybackIndex(0)
      return executionHistory[0]
    }
    return null
  }

  const getCurrentState = () => {
    if (currentPlaybackIndex >= 0 && currentPlaybackIndex < executionHistory.length) {
      return executionHistory[currentPlaybackIndex]
    }
    return null
  }

  const getPreviousState = () => {
    if (currentPlaybackIndex > 0 && currentPlaybackIndex < executionHistory.length) {
      return executionHistory[currentPlaybackIndex - 1]
    }
    return null
  }

  const startPlay = async (sourceCode: string, currentMap: GameMap) => {
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
        return { success: false, error: 'Aborted' }
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
          return { success: false, error: 'Aborted' }
        }
        
        const stepResult = await emulator.step()
        if (!stepResult || !stepResult.success || 
            stepResult.message?.includes('Execution completed') ||
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
      
      // Start auto-playing with variable timing
      setIsPlaying(true)
      
      const playNextStep = (playIndex: number) => {
        if (playIndex >= history.length) {
          // Playback finished
          setIsPlaying(false)
          return
        }
        
        setCurrentPlaybackIndex(playIndex)
        
        // Check if current step involves player movement
        const currentState = history[playIndex]
        const previousState = playIndex > 0 ? history[playIndex - 1] : null
        
        let isPlayerMove = false
        if (currentState && previousState) {
          const currentPos = currentState.mapState.playerPosition
          const previousPos = previousState.mapState.playerPosition
          
          isPlayerMove = !!(currentPos && previousPos && (
            currentPos.row !== previousPos.row || 
            currentPos.col !== previousPos.col
          ))
        }
        
        // Use different timing: 50ms normal, 500ms for player movement
        const nextDelay = isPlayerMove ? 500 : 50
        
        playTimeoutRef.current = setTimeout(() => {
          playNextStep(playIndex + 1)
        }, nextDelay)
      }
      
      playNextStep(1) // Start from step 1 (step 0 is initial state)
      
      return { success: true, initialState: history[0] }
    } catch (error) {
      console.error('Play initialization failed:', error)
      return { success: false, error }
    }
  }

  const stopPlay = useCallback(() => {
    setIsPlaying(false)
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current)
      playTimeoutRef.current = null
    }
  }, [])

  return {
    highlighter,
    executionHistory,
    currentPlaybackIndex,
    isPlaying,
    canStepUp: currentPlaybackIndex > 0,
    canStepDown: currentPlaybackIndex < executionHistory.length - 1,
    startDebug,
    startPlay,
    stopPlay,
    stepDown,
    stepUp,
    replay,
    reset,
    getCurrentState,
    getPreviousState
  }
}