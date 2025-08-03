'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import MapRenderer from '@/components/MapRenderer'
import { getMap, PlayerDirection, GameMap, TILE_MAPPING } from '@/data/maps'

export default function GamePage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  const initialMap = getMap('initial')
  
  if (!initialMap) {
    return <div>Map not found</div>
  }

  const [currentMap, setCurrentMap] = useState<GameMap>(initialMap)
  const [isAnimating, setIsAnimating] = useState(false)

  const canMoveTo = (row: number, col: number): boolean => {
    // Check boundaries
    if (row < 0 || row >= currentMap.height || col < 0 || col >= currentMap.width) {
      return false
    }
    
    // Check if tile is grass
    const tileSymbol = currentMap.tiles[row][col]
    const tileType = TILE_MAPPING[tileSymbol]
    return tileType === 'grass'
  }

  const getNextPosition = (currentRow: number, currentCol: number, direction: PlayerDirection) => {
    switch (direction) {
      case 'right':
        return { row: currentRow, col: currentCol + 1 }
      case 'up':
        return { row: currentRow - 1, col: currentCol }
      case 'left':
        return { row: currentRow, col: currentCol - 1 }
      case 'down':
        return { row: currentRow + 1, col: currentCol }
      default:
        return { row: currentRow, col: currentCol }
    }
  }

  const animateMovement = (fromRow: number, fromCol: number, toRow: number, toCol: number, direction: PlayerDirection) => {
    const TILE_SIZE = 64
    setIsAnimating(true)
    
    // Set starting position
    setCurrentMap(prev => ({
      ...prev,
      playerPosition: prev.playerPosition ? {
        ...prev.playerPosition,
        direction,
        animationPosition: {
          x: fromCol * TILE_SIZE,
          y: fromRow * TILE_SIZE
        }
      } : undefined
    }))

    // Trigger animation to end position
    setTimeout(() => {
      setCurrentMap(prev => ({
        ...prev,
        playerPosition: prev.playerPosition ? {
          ...prev.playerPosition,
          animationPosition: {
            x: toCol * TILE_SIZE,
            y: toRow * TILE_SIZE
          }
        } : undefined
      }))
    }, 10)

    // Complete animation and update final position
    setTimeout(() => {
      setCurrentMap(prev => ({
        ...prev,
        playerPosition: prev.playerPosition ? {
          row: toRow,
          col: toCol,
          direction,
          animationPosition: undefined
        } : undefined
      }))
      setIsAnimating(false)
    }, 310) // Slightly longer than CSS animation duration
  }

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentMap.playerPosition || isAnimating) return

      let newDirection: PlayerDirection = currentMap.playerPosition.direction
      let shouldMove = false

      switch (event.key) {
        case 'ArrowRight':
          newDirection = 'right'
          shouldMove = true
          break
        case 'ArrowUp':
          newDirection = 'up'
          shouldMove = true
          break
        case 'ArrowLeft':
          newDirection = 'left'
          shouldMove = true
          break
        case 'ArrowDown':
          newDirection = 'down'
          shouldMove = true
          break
        default:
          return
      }

      if (shouldMove) {
        const nextPos = getNextPosition(currentMap.playerPosition.row, currentMap.playerPosition.col, newDirection)
        
        if (canMoveTo(nextPos.row, nextPos.col)) {
          // Animate movement
          animateMovement(
            currentMap.playerPosition.row,
            currentMap.playerPosition.col,
            nextPos.row,
            nextPos.col,
            newDirection
          )
        } else {
          // Just turn direction without moving
          setCurrentMap(prev => ({
            ...prev,
            playerPosition: prev.playerPosition ? {
              ...prev.playerPosition,
              direction: newDirection
            } : undefined
          }))
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentMap, isAnimating])

  return (
    <div className="h-screen w-full p-4">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/preview"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg border border-gray-200 shadow-sm transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>
      
      {/* Game content */}
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{currentMap.name}</h1>
          <MapRenderer map={currentMap} />
          <div className="text-sm text-gray-600">
            Position: ({currentMap.playerPosition?.row || 0}, {currentMap.playerPosition?.col || 0}) | 
            Direction: {currentMap.playerPosition?.direction || 'unknown'}
          </div>
        </div>
      </div>
    </div>
  )
}