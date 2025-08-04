'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import MapRenderer from '@/components/MapRenderer'
import { getMap, PlayerDirection, GameMap, TILE_MAPPING } from '@/data/maps'

export default function GamePage() {
  // All hooks must be at the top level
  const initialMap = getMap('initial')
  const [currentMap, setCurrentMap] = useState<GameMap>(() => {
    return initialMap || {
      id: 'empty',
      name: 'Empty Map',
      width: 1,
      height: 1,
      tiles: [['.']]
    }
  })
  const [isAnimating, setIsAnimating] = useState(false)

  const canMoveTo = useCallback((row: number, col: number): boolean => {
    // Check boundaries
    if (row < 0 || row >= currentMap.height || col < 0 || col >= currentMap.width) {
      return false
    }
    
    // Check if tile is grass (player can only move on grass)
    const tileSymbol = currentMap.tiles[row][col]
    const tileType = TILE_MAPPING[tileSymbol]
    return tileType === 'grass'
  }, [currentMap.height, currentMap.width, currentMap.tiles])

  const getNextPosition = useCallback((currentRow: number, currentCol: number, direction: PlayerDirection) => {
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
  }, [])

  const animateMovement = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number, direction: PlayerDirection) => {
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

    // Remove dot halfway through animation (150ms)
    setTimeout(() => {
      setCurrentMap(prev => {
        const newDots = prev.dots?.filter(dot => !(dot.row === toRow && dot.col === toCol)) || []
        return {
          ...prev,
          dots: newDots
        }
      })
    }, 150)

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
  }, [])

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
        }
        // If can't move, do nothing (don't change direction)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentMap, isAnimating, canMoveTo, getNextPosition, animateMovement])

  // Conditional logic after all hooks
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  if (!initialMap) {
    return <div>Map not found</div>
  }

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