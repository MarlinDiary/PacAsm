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