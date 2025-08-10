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
  const [previousRegisters, setPreviousRegisters] = useState<RegisterInfo[]>([])
  const currentRegistersRef = useRef<RegisterInfo[]>([])
  const [currentMemory, setCurrentMemory] = useState<{ codeMemory: number[], stackMemory: number[], dataMemory: number[] }>({ 
    codeMemory: [], 
    stackMemory: [], 
    dataMemory: [] 
  })
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentCodeRef = useRef<string>('')

  const startPlay = async (sourceCode: string, initialMap: GameMap) => {
    currentCodeRef.current = sourceCode
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setMovementActions([])
    setCurrentMap(initialMap)
    setHighlightedLine(undefined)
    setIsPlaying(true)
    
    try {
      if (abortController.signal.aborted) {
        return { success: false, error: 'INIT_ERROR: Operation Aborted' }
      }
      
      if (!emulator.state.isInitialized) {
        await emulator.initializeEmulator()
      }
      
      await emulator.reset()
      
      const assembler = new ARMAssembler()
      await assembler.initialize()
      const result = await assembler.assemble(sourceCode)
      
      const memorySize = 1024
      const zeroData = new Array(memorySize).fill(0)
      await emulator.writeMemory(0x10000, zeroData)
      await emulator.writeMemory(0x20000, zeroData)
      await emulator.writeMemory(0x30000, zeroData)
      
      await emulator.loadCode(Array.from(result.mc))
      
      const codeHighlighter = await createHighlighterWithCompiledCode(sourceCode, result.mc)
      
      assembler.destroy()
      
      if (abortController.signal.aborted) {
        setIsPlaying(false)
        return { success: false, error: 'INIT_ERROR: Operation Aborted' }
      }
      
      const initialRegisters = await emulator.getAllRegisters()
      const initialCodeMemory = await emulator.getMemory(0x10000, 1024)
      const initialStackMemory = await emulator.getMemory(0x20000, 1024)
      const initialDataMemory = await emulator.getMemory(0x30000, 1024)
      
      if (initialRegisters) {
        setPreviousRegisters(initialRegisters)
        setCurrentRegisters(initialRegisters)
        currentRegistersRef.current = initialRegisters
      }
      if (initialCodeMemory && initialStackMemory && initialDataMemory) {
        setCurrentMemory({
          codeMemory: initialCodeMemory.data,
          stackMemory: initialStackMemory.data,
          dataMemory: initialDataMemory.data
        })
      }
      
      await executeWithDelays(initialMap, codeHighlighter, abortController)
      
      return { success: true }
    } catch (error) {
      addError('INIT_ERROR: Failed to Run Code', currentCodeRef.current)
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
        addError('RUNTIME_ERROR: Execution Failed', currentCodeRef.current)
        break
      }
      
      if (stepResult.message?.includes('Execution completed') ||
          stepResult.message?.includes('reached end of code') ||
          stepResult.message?.includes('no more instructions')) {
        break
      }
      
      instructionCount++
      
      const highlight = getHighlightFromStepResult(stepResult, codeHighlighter)
      const currentHighlight = highlight?.lineNumber
      setHighlightedLine(currentHighlight)
      
      const dataMemory = await emulator.getMemory(0x30000, 1)
      
      if (dataMemory && dataMemory.data[0] >= 1 && dataMemory.data[0] <= 4 && currentMapState.playerPosition) {
        movementCount++
        instructionCount = 0
        
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
          playerPosition: { ...currentMapState.playerPosition, row: newRow, col: newCol, direction: newDirection, shouldAnimate: true },
          dots: updatedDots
        }
        
        actions.push({
          instructionCount: movementCount,
          mapState: { ...currentMapState },
          highlightedLine: currentHighlight
        })
        
        setCurrentMap({ ...currentMapState })
        
        const registers = await emulator.getAllRegisters()
        const codeMemory = await emulator.getMemory(0x10000, 1024)
        const stackMemory = await emulator.getMemory(0x20000, 1024)
        const updatedDataMemory = await emulator.getMemory(0x30000, 1024)
        
        if (registers) {
          setPreviousRegisters(currentRegistersRef.current)
          setCurrentRegisters(registers)
          currentRegistersRef.current = registers
        }
        if (codeMemory && stackMemory && updatedDataMemory) {
          setCurrentMemory({
            codeMemory: codeMemory.data,
            stackMemory: stackMemory.data,
            dataMemory: updatedDataMemory.data
          })
        }
        
        await emulator.writeMemory(0x30000, [0])
        
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        const registers = await emulator.getAllRegisters()
        const codeMemory = await emulator.getMemory(0x10000, 1024)
        const stackMemory = await emulator.getMemory(0x20000, 1024)
        const currentDataMemory = await emulator.getMemory(0x30000, 1024)
        
        if (registers) {
          setPreviousRegisters(currentRegistersRef.current)
          setCurrentRegisters(registers)
          currentRegistersRef.current = registers
        }
        if (codeMemory && stackMemory && currentDataMemory) {
          setCurrentMemory({
            codeMemory: codeMemory.data,
            stackMemory: stackMemory.data,
            dataMemory: currentDataMemory.data
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      if (instructionCount >= 1000) {
        setIsPlaying(false)
        addError('TIMEOUT_ERROR: Too Many Instructions without Movement', currentCodeRef.current)
        return { success: false, error: 'TIMEOUT_ERROR: Too Many Instructions without Movement' }
      }
    }
    
    if (movementCount >= 300) {
      console.warn('WARNING: Maximum Movement Instructions Reached (300)')
    }
    
    setPreviousRegisters([])
    setCurrentRegisters([])
    currentRegistersRef.current = []
    setCurrentMemory({ codeMemory: [], stackMemory: [], dataMemory: [] })
    setCurrentMap(null)
    
    setMovementActions(actions)
    setHighlightedLine(undefined)
    setIsPlaying(false)
  }

  const stopPlay = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsPlaying(false)
  }, [])

  const reset = useCallback(async () => {
    stopPlay()
    
    setMovementActions([])
    setCurrentMap(null)
    setHighlightedLine(undefined)
    setPreviousRegisters([])
    setCurrentRegisters([])
    currentRegistersRef.current = []
    setCurrentMemory({ codeMemory: [], stackMemory: [], dataMemory: [] })
    
    try {
      await emulator.reset()
    } catch (error) {}
  }, [emulator, stopPlay])

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

  const getPreviousState = () => {
    if (!currentMap) return null
    
    return {
      mapState: currentMap,
      highlightedLine,
      registers: previousRegisters,
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
    executionHistory: [],
    currentPlaybackIndex: -1,
    startPlay,
    stopPlay,
    reset,
    getCurrentState,
    getPreviousState
  }
}