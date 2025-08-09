import { useState, useRef, useCallback } from 'react'
import { useEmulator } from './useEmulator'
import { GameMap } from '@/data/maps'
import { CodeHighlighter, createHighlighterWithCompiledCode, getHighlightFromStepResult } from '@/lib/highlighter'
import { ARMAssembler } from '@/lib/assembler'
import { RegisterInfo } from '@/workers/emulator/types'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'

interface MovementAction {
  instructionCount: number
  mapState: GameMap
  highlightedLine: number | undefined
}

export const usePlayRunner = () => {
  const emulator = useEmulator()
  const addError = useDiagnosticsStore((state) => state.addError)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null)
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined)
  const [movementActions, setMovementActions] = useState<MovementAction[]>([])
  const [currentRegisters, setCurrentRegisters] = useState<RegisterInfo[]>([])
  const [currentMemory, setCurrentMemory] = useState<{ codeMemory: number[], stackMemory: number[], dataMemory: number[] }>({ 
    codeMemory: [], 
    stackMemory: [], 
    dataMemory: [] 
  })
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentCodeRef = useRef<string>('')

  const startPlay = async (sourceCode: string, initialMap: GameMap) => {
    // Store the source code for error reporting
    currentCodeRef.current = sourceCode
    
    // Abort any previous execution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Clear previous state
    setMovementActions([])
    setCurrentMap(initialMap)
    setHighlightedLine(undefined)
    setIsPlaying(true)
    
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
      
      assembler.destroy()
      
      // Check abort before starting execution
      if (abortController.signal.aborted) {
        setIsPlaying(false)
        return { success: false, error: 'INIT_ERROR: Operation aborted' }
      }
      
      // Get initial panel data
      const initialRegisters = await emulator.getAllRegisters()
      const initialCodeMemory = await emulator.getMemory(0x10000, 1024)
      const initialStackMemory = await emulator.getMemory(0x20000, 1024)
      const initialDataMemory = await emulator.getMemory(0x30000, 1024)
      
      if (initialRegisters) setCurrentRegisters(initialRegisters)
      if (initialCodeMemory && initialStackMemory && initialDataMemory) {
        setCurrentMemory({
          codeMemory: initialCodeMemory.data,
          stackMemory: initialStackMemory.data,
          dataMemory: initialDataMemory.data
        })
      }
      
      // Start fast execution
      await executeWithDelays(initialMap, codeHighlighter, abortController)
      
      return { success: true }
    } catch (error) {
      // Silently handle - error already added to diagnostics
      addError('INIT_ERROR: Failed to initialize play mode', currentCodeRef.current)
      setIsPlaying(false)
      return { success: false, error }
    }
  }

  const executeWithDelays = async (initialMap: GameMap, codeHighlighter: CodeHighlighter, abortController: AbortController) => {
    let currentMapState = { ...initialMap }
    let instructionCount = 0
    let movementCount = 0
    const actions: MovementAction[] = []
    
    while (movementCount < 300 && instructionCount < 1000) {
      if (abortController.signal.aborted) {
        setIsPlaying(false)
        return
      }
      
      const stepResult = await emulator.step()
      if (!stepResult) {
        break
      }
      
      if (!stepResult.success) {
        // Silently handle - error already added to diagnostics
        addError('RUNTIME_ERROR: Execution failed', currentCodeRef.current)
        break
      }
      
      if (stepResult.message?.includes('Execution completed') ||
          stepResult.message?.includes('reached end of code') ||
          stepResult.message?.includes('no more instructions')) {
        break
      }
      
      instructionCount++
      
      // Update highlighted line for visual feedback
      const highlight = getHighlightFromStepResult(stepResult, codeHighlighter)
      const currentHighlight = highlight?.lineNumber
      setHighlightedLine(currentHighlight)
      
      // Check for player movement command
      const dataMemory = await emulator.getMemory(0x30000, 1)
      
      if (dataMemory && dataMemory.data[0] >= 1 && dataMemory.data[0] <= 4 && currentMapState.playerPosition) {
        movementCount++
        instructionCount = 0 // Reset instruction counter on movement
        
        let newRow = currentMapState.playerPosition.row
        let newCol = currentMapState.playerPosition.col
        let newDirection = currentMapState.playerPosition.direction
        
        switch (dataMemory.data[0]) {
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
        
        // Record this movement action
        actions.push({
          instructionCount: movementCount,
          mapState: { ...currentMapState },
          highlightedLine: currentHighlight
        })
        
        // Update UI immediately
        setCurrentMap({ ...currentMapState })
        
        // Update panel data during movement (before clearing memory)
        const registers = await emulator.getAllRegisters()
        const codeMemory = await emulator.getMemory(0x10000, 1024)
        const stackMemory = await emulator.getMemory(0x20000, 1024)
        const updatedDataMemory = await emulator.getMemory(0x30000, 1024)
        
        if (registers) setCurrentRegisters(registers)
        if (codeMemory && stackMemory && updatedDataMemory) {
          setCurrentMemory({
            codeMemory: codeMemory.data,
            stackMemory: stackMemory.data,
            dataMemory: updatedDataMemory.data
          })
        }
        
        // Clear the movement command after updating panel data
        await emulator.writeMemory(0x30000, [0])
        
        // Delay for movement command
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        // Update panel data occasionally for non-movement instructions
        if (instructionCount % 10 === 0) { // Every 10 instructions
          const registers = await emulator.getAllRegisters()
          const codeMemory = await emulator.getMemory(0x10000, 1024)
          const stackMemory = await emulator.getMemory(0x20000, 1024)
          const currentDataMemory = await emulator.getMemory(0x30000, 1024)
          
          if (registers) setCurrentRegisters(registers)
          if (codeMemory && stackMemory && currentDataMemory) {
            setCurrentMemory({
              codeMemory: codeMemory.data,
              stackMemory: stackMemory.data,
              dataMemory: currentDataMemory.data
            })
          }
        }
        
        // Regular instruction delay
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Check for timeout
      if (instructionCount >= 1000) {
        setIsPlaying(false)
        addError('TIMEOUT_ERROR: Execution timeout - too many instructions without movement', currentCodeRef.current)
        return { success: false, error: 'TIMEOUT_ERROR: Execution timeout - too many instructions without movement' }
      }
    }
    
    if (movementCount >= 300) {
      console.warn('WARNING: Maximum movement instructions reached (300)')
    }
    
    // Clear all data when execution ends
    setCurrentRegisters([])
    setCurrentMemory({ codeMemory: [], stackMemory: [], dataMemory: [] })
    setCurrentMap(null) // Clear map to prevent conflicts
    
    setMovementActions(actions)
    setHighlightedLine(undefined) // Clear highlight when execution ends
    setIsPlaying(false)
  }

  const stopPlay = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsPlaying(false)
  }, [])

  const reset = useCallback(async () => {
    // Stop any ongoing execution
    stopPlay()
    
    // Clear all state
    setMovementActions([])
    setCurrentMap(null)
    setHighlightedLine(undefined)
    setCurrentRegisters([])
    setCurrentMemory({ codeMemory: [], stackMemory: [], dataMemory: [] })
    
    try {
      await emulator.reset()
    } catch (error) {
      // Silently handle reset failure
    }
  }, [emulator, stopPlay])

  // For compatibility - return current state with panel data
  const getCurrentState = () => {
    if (!currentMap) return null
    
    return {
      mapState: currentMap,
      highlightedLine,
      registers: currentRegisters,
      codeMemory: currentMemory.codeMemory,
      stackMemory: currentMemory.stackMemory,
      dataMemory: currentMemory.dataMemory,
      stepResult: null
    }
  }

  return {
    isPlaying,
    currentMap,
    highlightedLine,
    movementActions,
    executionHistory: [], // Empty for compatibility
    currentPlaybackIndex: -1, // Not used in play mode
    startPlay,
    stopPlay,
    reset,
    getCurrentState
  }
}