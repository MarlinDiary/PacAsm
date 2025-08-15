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
  [key: string]: any
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
  // Find current player position
  let playerRow = -1, playerCol = -1
  for (let row = 0; row < currentMap.height; row++) {
    for (let col = 0; col < currentMap.width; col++) {
      if (currentMap.tiles[row][col] === 'P') {
        playerRow = row
        playerCol = col
        break
      }
    }
    if (playerRow !== -1) break
  }

  if (playerRow === -1) return currentMap // No player found

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

  // Create updated tiles array
  const updatedTiles = currentMap.tiles.map(row => [...row])

  // Check for dot collision and collect it
  if (updatedTiles[newRow][newCol] === '.') {
    updatedTiles[newRow][newCol] = ' ' // Replace dot with grass
  }

  // Move player: clear old position and set new position
  updatedTiles[playerRow][playerCol] = ' ' // Clear old player position
  updatedTiles[newRow][newCol] = 'P' // Set new player position

  return {
    ...currentMap,
    tiles: updatedTiles,
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
  // Create updated tiles array
  const updatedTiles = mapState.tiles.map(row => [...row])
  
  // Check for dot collision and collect it
  if (updatedTiles[newRow][newCol] === '.') {
    updatedTiles[newRow][newCol] = ' ' // Replace dot with grass
  }
  
  // Move player: clear old position and set new position
  updatedTiles[oldRow][oldCol] = ' ' // Clear old player position
  updatedTiles[newRow][newCol] = 'P' // Set new player position
  
  return {
    ...mapState,
    tiles: updatedTiles,
    playerAnimation: createPlayerAnimation(direction)
  }
}