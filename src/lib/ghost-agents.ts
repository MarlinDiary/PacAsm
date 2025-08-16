/**
 * Ghost Agents - Simple AI algorithms for ghost movement
 */

import { GameMap } from '@/data/maps';

export interface Position {
  row: number;
  col: number;
}

/**
 * Check if a position is valid for movement (not air/wall)
 */
function isValidPosition(map: GameMap, row: number, col: number): boolean {
  if (row < 0 || row >= map.height || col < 0 || col >= map.width) {
    return false;
  }
  return map.tiles[row][col] !== '%';
}

/**
 * Get all valid adjacent positions from current position
 */
function getValidMoves(map: GameMap, position: Position): Position[] {
  const moves: Position[] = [];
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 },  // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }   // right
  ];

  for (const dir of directions) {
    const newRow = position.row + dir.row;
    const newCol = position.col + dir.col;
    if (isValidPosition(map, newRow, newCol)) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

/**
 * Algorithm 1: Smart patrol movement
 * More intelligent than pure random - prefers continuing straight, explores areas, avoids backtracking
 */
export function smartPatrolGhostMove(map: GameMap, ghostPosition: Position, pacmanPosition: Position, previousPosition?: Position): Position {
  const validMoves = getValidMoves(map, ghostPosition);
  
  if (validMoves.length === 0) {
    return ghostPosition;
  }
  
  // Calculate direction from previous position (if available)
  let currentDirection: {row: number, col: number} | null = null;
  if (previousPosition) {
    currentDirection = {
      row: ghostPosition.row - previousPosition.row,
      col: ghostPosition.col - previousPosition.col
    };
  }
  
  // Score each move based on multiple factors
  const moveScores = validMoves.map(move => {
    let score = 0;
    
    // Factor 1: Prefer continuing in same direction (momentum)
    if (currentDirection) {
      const moveDirection = {
        row: move.row - ghostPosition.row,
        col: move.col - ghostPosition.col
      };
      
      if (moveDirection.row === currentDirection.row && moveDirection.col === currentDirection.col) {
        score += 50; // Strong preference for continuing straight
      }
    }
    
    // Factor 2: Avoid going back to previous position
    if (previousPosition && move.row === previousPosition.row && move.col === previousPosition.col) {
      score -= 100; // Strong penalty for backtracking
    }
    
    // Factor 3: Prefer intersections for exploration (positions with more exits)
    const movesFromNewPos = getValidMoves(map, move);
    if (movesFromNewPos.length >= 3) {
      score += 20; // Bonus for intersections
    }
    
    // Factor 4: Maintain some distance from pacman (don't get too close accidentally)
    const distanceToPacman = Math.abs(move.row - pacmanPosition.row) + Math.abs(move.col - pacmanPosition.col);
    if (distanceToPacman < 3) {
      score -= 10; // Small penalty for getting too close
    } else if (distanceToPacman > 8) {
      score += 5; // Small bonus for not being too far
    }
    
    // Factor 5: Slight randomness to prevent predictable patterns
    score += Math.random() * 10;
    
    return { move, score };
  });
  
  // Sort by score and pick from top moves with some randomness
  moveScores.sort((a, b) => b.score - a.score);
  
  // Pick from the top 2-3 moves to maintain some unpredictability
  const topMoves = moveScores.slice(0, Math.min(3, moveScores.length));
  const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
  
  return selectedMove.move;
}

/**
 * Algorithm 2: BFS optimal path pursuit
 * Uses breadth-first search to find shortest path to pacman
 */
export function bfsGhostMove(map: GameMap, ghostPosition: Position, pacmanPosition: Position): Position {
  // BFS to find shortest path
  const queue: {pos: Position, path: Position[]}[] = [{pos: ghostPosition, path: []}];
  const visited = new Set<string>();
  const getKey = (pos: Position) => `${pos.row},${pos.col}`;
  
  visited.add(getKey(ghostPosition));
  
  while (queue.length > 0) {
    const {pos: current, path} = queue.shift()!;
    
    // Found pacman
    if (current.row === pacmanPosition.row && current.col === pacmanPosition.col) {
      // Return first step in path, or stay if already at target
      return path.length > 0 ? path[0] : ghostPosition;
    }
    
    // Explore neighbors
    for (const neighbor of getValidMoves(map, current)) {
      const key = getKey(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          pos: neighbor, 
          path: [...path, neighbor]
        });
      }
    }
  }
  
  // No path found, fallback to smart patrol movement
  return smartPatrolGhostMove(map, ghostPosition, ghostPosition);
}