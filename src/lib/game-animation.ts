import { GameMap, PlayerDirection } from '@/data/maps'

export interface PlayerAnimationState {
  direction: PlayerDirection
  shouldAnimate?: boolean
  animationPosition?: {
    x: number
    y: number
  }
  teleportAnimation?: 'fade-out' | 'fade-in'
}

export interface AnimatedGameState {
  mapState: GameMap
  [key: string]: unknown
}

/**
 * Movement command to direction mapping
 */
export const MOVEMENT_DIRECTIONS: Record<number, PlayerDirection> = {
  1: 'up',
  2: 'down', 
  3: 'left',
  4: 'right'
}

/**
 * Creates player animation state based on movement command
 */
export function createPlayerAnimation(
  command: number,
  shouldAnimate: boolean = true
): PlayerAnimationState {
  return {
    direction: MOVEMENT_DIRECTIONS[command] || 'right',
    shouldAnimate
  }
}

/**
 * Updates map with player movement and animation
 */
export function updateMapWithMovement(
  currentMap: GameMap, 
  command: number
): GameMap {
  // Get current player position from map data
  const playerPosition = currentMap.playerPosition
  if (!playerPosition) return currentMap // No player found

  const playerRow = playerPosition.row
  const playerCol = playerPosition.col

  // Calculate new position
  let newRow = playerRow
  let newCol = playerCol

  switch (command) {
    case 1: newRow = Math.max(0, playerRow - 1); break
    case 2: newRow = Math.min(currentMap.height - 1, playerRow + 1); break
    case 3: newCol = Math.max(0, playerCol - 1); break
    case 4: newCol = Math.min(currentMap.width - 1, playerCol + 1); break
    default: return currentMap
  }

  // Check if new position is valid (not air/wall)
  if (currentMap.tiles[newRow][newCol] === '%') {
    // Cannot move to air/wall, only update direction
    return {
      ...currentMap,
      playerAnimation: createPlayerAnimation(command)
    }
  }

  // Create updated tiles array
  const updatedTiles = currentMap.tiles.map(row => [...row])

  // Check for dot collision and collect it
  if (updatedTiles[newRow][newCol] === '.') {
    updatedTiles[newRow][newCol] = ' ' // Replace dot with grass
  }

  // Get direction for player movement
  let newDirection = playerPosition.direction
  switch (command) {
    case 1: newDirection = 'up'; break
    case 2: newDirection = 'down'; break
    case 3: newDirection = 'left'; break
    case 4: newDirection = 'right'; break
  }

  return {
    ...currentMap,
    tiles: updatedTiles,
    playerPosition: {
      row: newRow,
      col: newCol,
      direction: newDirection
    },
    playerAnimation: createPlayerAnimation(command)
  }
}

/**
 * Ensures any game state has proper animation state for smooth transitions
 */
export function ensurePlayerAnimation<T extends AnimatedGameState>(
  state: T,
  defaultDirection: PlayerDirection = 'right'
): T {
  return {
    ...state,
    mapState: {
      ...state.mapState,
      playerAnimation: {
        ...state.mapState.playerAnimation,
        direction: state.mapState.playerAnimation?.direction || defaultDirection,
        shouldAnimate: true
      }
    }
  }
}

/**
 * Creates teleport animation state
 */
export function createTeleportAnimation(
  direction: PlayerDirection,
  animationType: 'fade-out' | 'fade-in'
): PlayerAnimationState {
  return {
    direction,
    teleportAnimation: animationType
  }
}

/**
 * Updates map after movement for play/debug scenarios
 */
export function updateMapAfterMovement(
  mapState: GameMap, 
  oldRow: number, 
  oldCol: number, 
  newRow: number, 
  newCol: number, 
  direction: number
): GameMap {
  // Check if new position is valid (not air/wall)
  if (mapState.tiles[newRow][newCol] === '%') {
    // Cannot move to air/wall, only update direction
    return {
      ...mapState,
      playerAnimation: createPlayerAnimation(direction)
    }
  }

  // Create updated tiles array
  const updatedTiles = mapState.tiles.map(row => [...row])
  
  // Check for dot collision and collect it
  if (updatedTiles[newRow][newCol] === '.') {
    updatedTiles[newRow][newCol] = ' ' // Replace dot with grass
  }
  
  // Get direction for player movement
  let newDirection = mapState.playerPosition.direction
  switch (direction) {
    case 1: newDirection = 'up'; break
    case 2: newDirection = 'down'; break
    case 3: newDirection = 'left'; break
    case 4: newDirection = 'right'; break
  }
  
  return {
    ...mapState,
    tiles: updatedTiles,
    playerPosition: {
      row: newRow,
      col: newCol,
      direction: newDirection
    },
    playerAnimation: createPlayerAnimation(direction)
  }
}