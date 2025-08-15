import { GameMap } from '@/data/maps'
import { checkVictoryCondition } from '@/lib/game-logic'
import { updateMapWithMovement } from '@/lib/game-animation'
import { resetAndReloadCode, getEmulatorMemoryState, MEMORY_CONFIG } from '@/lib/emulator-utils'
import { RegisterInfo } from '@/workers/emulator/types'

export interface MemoryState {
  registers: RegisterInfo[]
  codeMemory: number[]
  stackMemory: number[]
  dataMemory: number[]
}

export interface CycleEndResult {
  newMapState: GameMap
  isGameComplete: boolean
  shouldContinue: boolean
  memoryState?: MemoryState | null
}

// Type for emulator objects (avoiding 'any')
interface EmulatorInstance {
  state: { isInitialized: boolean }
  initializeEmulator(): Promise<void>
  reset(): Promise<void>
  writeMemory(address: number, data: number[]): Promise<boolean>
  loadCode(code: number[]): Promise<void>
  getAllRegisters(): Promise<RegisterInfo[] | null>
  getMemory(address: number, size: number): Promise<{ data: number[] } | null>
}

export interface CycleEndOptions {
  emulator: EmulatorInstance
  currentMapState: GameMap
  originalMachineCode?: number[]
  skipEmulatorReset?: boolean
}

/**
 * Check if there's a valid movement command in data memory
 */
export function hasValidMovementCommand(dataMemory: number[]): boolean {
  return dataMemory && dataMemory[0] >= 1 && dataMemory[0] <= 4
}

/**
 * Process movement from memory and update map state
 */
export function processMovementFromMemory(
  mapState: GameMap, 
  dataMemory: number[]
): GameMap {
  if (hasValidMovementCommand(dataMemory)) {
    return updateMapWithMovement(mapState, dataMemory[0])
  }
  return mapState
}

/**
 * Handle end of code execution cycle - common logic for both debug and play modes
 */
export async function handleCycleEnd(options: CycleEndOptions): Promise<CycleEndResult> {
  const { emulator, currentMapState, originalMachineCode, skipEmulatorReset = false } = options
  
  // Get current memory state to check for movement commands
  const memoryState = await getEmulatorMemoryState(emulator)
  
  // Process any movement commands
  let newMapState = currentMapState
  if (memoryState && hasValidMovementCommand(memoryState.dataMemory)) {
    newMapState = updateMapWithMovement(currentMapState, memoryState.dataMemory[0])
  }
  
  // Check victory condition
  const isGameComplete = checkVictoryCondition(newMapState)
  
  // Reset emulator for next cycle if game is not complete and machine code is provided
  if (!isGameComplete && !skipEmulatorReset && originalMachineCode) {
    await resetAndReloadCode(emulator, originalMachineCode)
  }
  
  return {
    newMapState,
    isGameComplete,
    shouldContinue: !isGameComplete,
    memoryState
  }
}

/**
 * Handle cycle end specifically for debug mode
 */
export async function handleDebugCycleEnd(
  emulator: EmulatorInstance,
  currentMapState: GameMap,
  originalMachineCode: number[],
  setIsGameComplete: (complete: boolean) => void
): Promise<CycleEndResult> {
  const result = await handleCycleEnd({
    emulator,
    currentMapState,
    originalMachineCode
  })
  
  // Set game complete state for debug mode
  if (result.isGameComplete) {
    setIsGameComplete(true)
  }
  
  return result
}

/**
 * Handle cycle end specifically for play mode
 */
export async function handlePlayCycleEnd(
  emulator: EmulatorInstance,
  currentMapState: GameMap
): Promise<CycleEndResult> {
  return await handleCycleEnd({
    emulator,
    currentMapState,
    skipEmulatorReset: true // Play mode handles reset differently
  })
}

/**
 * Clear movement command from data memory after processing
 */
export async function clearMovementCommand(emulator: EmulatorInstance): Promise<void> {
  await emulator.writeMemory(MEMORY_CONFIG.DATA_BASE, [0])
}

/**
 * Check if code execution has ended based on step result
 */
export function isCodeExecutionComplete(stepResult: { message?: string }): boolean {
  return stepResult?.message?.includes('Execution completed') ||
         stepResult?.message?.includes('reached end of code') ||
         stepResult?.message?.includes('no more instructions') ||
         false
}