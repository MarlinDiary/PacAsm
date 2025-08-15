import { GameMap } from '@/data/maps'

export interface PlayerMovement {
  newRow: number
  newCol: number
  newDirection: 'up' | 'down' | 'left' | 'right'
  collectedDot: boolean
  updatedMap: GameMap
}

export const movePlayer = async (
  currentMap: GameMap, 
  command: number, 
  writeMemoryFn: (address: number, data: number[]) => Promise<boolean>
): Promise<PlayerMovement | null> => {
  if (!currentMap.playerPosition) return null
  
  let newRow = currentMap.playerPosition.row
  let newCol = currentMap.playerPosition.col
  let newDirection = currentMap.playerPosition.direction
  
  switch (command) {
    case 1: // Up
      newRow = Math.max(0, newRow - 1)
      newDirection = 'up'
      break
    case 2: // Down  
      newRow = Math.min(currentMap.height - 1, newRow + 1)
      newDirection = 'down'
      break
    case 3: // Left
      newCol = Math.max(0, newCol - 1)
      newDirection = 'left'
      break
    case 4: // Right
      newCol = Math.min(currentMap.width - 1, newCol + 1)
      newDirection = 'right'
      break
    default:
      return null
  }
  
  // Check for dot collision
  const updatedDots = currentMap.dots ? [...currentMap.dots] : []
  const dotIndex = updatedDots.findIndex(dot => dot.row === newRow && dot.col === newCol)
  let collectedDot = false
  
  if (dotIndex !== -1) {
    collectedDot = true
    updatedDots.splice(dotIndex, 1)
  }
  
  const updatedMap = {
    ...currentMap,
    playerPosition: {
      ...currentMap.playerPosition,
      row: newRow,
      col: newCol,
      direction: newDirection
    },
    dots: updatedDots
  }
  
  // Reset the command memory to 0
  await writeMemoryFn(0x30000, [0])
  
  return {
    newRow,
    newCol,
    newDirection,
    collectedDot,
    updatedMap
  }
}

export const handleDotCollection = (
  setCurrentMap: (mapOrUpdater: GameMap | ((prevMap: GameMap) => GameMap)) => void,
  row: number,
  col: number
) => {
  setTimeout(() => {
    setCurrentMap(prevMap => ({
      ...prevMap,
      dots: prevMap.dots?.filter(dot => !(dot.row === row && dot.col === col)) || []
    }))
  }, 200)
}

// Victory condition checking
export const checkVictoryCondition = (map: GameMap): boolean => {
  return map.dots ? map.dots.length === 0 : false
}

// Game state management interface  
export interface GameVictoryState {
  hasWon: boolean // Permanent victory status (shows Next button)
  currentPlayWon: boolean // Current play victory status (shows confetti)
}

// Victory handler - processes victory condition and updates states
export const handleVictoryCheck = (
  map: GameMap,
  setHasWon: (won: boolean) => void,
  setCurrentPlayWon: (won: boolean) => void,
  isPlayMode: boolean
): boolean => {
  if (isPlayMode && checkVictoryCondition(map)) {
    setHasWon(true) // Permanent victory status
    setCurrentPlayWon(true) // This play victory status
    return true
  }
  return false
}