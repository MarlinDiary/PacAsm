'use client'

import { useState } from 'react'
import { Copy, Plus, Minus, RotateCcw, Check } from 'lucide-react'
import MapRenderer from '@/components/MapRenderer'
import { GameMap, TileSymbol } from '@/data/maps'

const TILE_TYPES: { symbol: TileSymbol; name: string; color: string }[] = [
  { symbol: '.', name: 'Grass', color: '#4ade80' },
  { symbol: '*', name: 'Campfire', color: '#f97316' },
  { symbol: ' ', name: 'Air', color: '#e5e5e5' }
]

export default function MapEditor() {
  const [width, setWidth] = useState(5)
  const [height, setHeight] = useState(5)
  const [tileSize, setTileSize] = useState(64)
  const [selectedTile, setSelectedTile] = useState<TileSymbol>('.')
  const [tiles, setTiles] = useState<TileSymbol[][]>(() => 
    Array(height).fill(null).map(() => Array(width).fill('.'))
  )
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 })
  const [dots, setDots] = useState<{ row: number; col: number }[]>([])
  const [placingMode, setPlacingMode] = useState<'tile' | 'player' | 'dot'>('tile')
  const [copied, setCopied] = useState(false)

  const resizeMap = (newWidth: number, newHeight: number) => {
    const newTiles: TileSymbol[][] = Array(newHeight).fill(null).map(() => Array(newWidth).fill(' '))
    
    for (let r = 0; r < Math.min(height, newHeight); r++) {
      for (let c = 0; c < Math.min(width, newWidth); c++) {
        newTiles[r][c] = tiles[r][c]
      }
    }
    
    setTiles(newTiles)
    setWidth(newWidth)
    setHeight(newHeight)
  }

  const handleTileClick = (row: number, col: number) => {
    if (placingMode === 'tile') {
      const newTiles = [...tiles]
      newTiles[row][col] = selectedTile
      setTiles(newTiles)
    } else if (placingMode === 'player') {
      setPlayerPos({ row, col })
    } else if (placingMode === 'dot') {
      const existingDotIndex = dots.findIndex(d => d.row === row && d.col === col)
      if (existingDotIndex >= 0) {
        setDots(dots.filter((_, i) => i !== existingDotIndex))
      } else {
        setDots([...dots, { row, col }])
      }
    }
  }

  const clearMap = () => {
    setTiles(Array(height).fill(null).map(() => Array(width).fill('.')))
    setDots([])
    setPlayerPos({ row: 0, col: 0 })
  }

  const generateMapData = (): GameMap => {
    return {
      id: 'custom',
      name: 'Custom Map',
      width,
      height,
      tileSize,
      tiles,
      playerPosition: {
        row: playerPos.row,
        col: playerPos.col,
        direction: 'right'
      },
      dots: dots.length > 0 ? dots : undefined,
      waterBackground: { tilesX: 35, tilesY: 35 },
      initialCode: `LDR   R0, =0x00030000\nMOV   R1, #4\nSTR   R1, [R0]`,
      hint: 'Custom level hint'
    }
  }

  const copyMapData = () => {
    const mapData = generateMapData()
    const mapString = `{
  id: 'custom',
  name: 'Custom Map',
  width: ${mapData.width},
  height: ${mapData.height},
  tileSize: ${mapData.tileSize},
  tiles: [
${mapData.tiles.map(row => `    ['${row.join("', '")}']`).join(',\n')}
  ],
  playerPosition: { row: ${mapData.playerPosition?.row}, col: ${mapData.playerPosition?.col}, direction: 'right' },
  dots: [${mapData.dots?.map(d => `{ row: ${d.row}, col: ${d.col} }`).join(', ') || ''}],
  waterBackground: { tilesX: 35, tilesY: 35 },
  initialCode: \`LDR   R0, =0x00030000
MOV   R1, #4
STR   R1, [R0]\`,
  hint: 'Custom level hint'
}`
    
    navigator.clipboard.writeText(mapString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentMap = generateMapData()

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Map Editor</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            {/* Size Controls */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Map Size</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-20">Width:</span>
                  <button 
                    onClick={() => resizeMap(Math.max(1, width - 1), height)}
                    className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center">{width}</span>
                  <button 
                    onClick={() => resizeMap(Math.min(10, width + 1), height)}
                    className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20">Height:</span>
                  <button 
                    onClick={() => resizeMap(width, Math.max(1, height - 1))}
                    className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center">{height}</span>
                  <button 
                    onClick={() => resizeMap(width, Math.min(10, height + 1))}
                    className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20">Tile Size:</span>
                  <button 
                    onClick={() => setTileSize(Math.max(32, tileSize - 8))}
                    className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center">{tileSize}</span>
                  <button 
                    onClick={() => setTileSize(Math.min(128, tileSize + 8))}
                    className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Placement Mode */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Placement Mode</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlacingMode('tile')}
                  className={`px-3 py-2 rounded ${placingMode === 'tile' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Place Tiles
                </button>
                <button
                  onClick={() => setPlacingMode('player')}
                  className={`px-3 py-2 rounded ${placingMode === 'player' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                  Place Player
                </button>
                <button
                  onClick={() => setPlacingMode('dot')}
                  className={`px-3 py-2 rounded ${placingMode === 'dot' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
                >
                  Place Dots
                </button>
              </div>
            </div>

            {/* Tile Selection */}
            {placingMode === 'tile' && (
              <div className="bg-white rounded-lg p-4 shadow">
                <h2 className="text-lg font-semibold mb-3">Select Tile</h2>
                <div className="flex gap-2">
                  {TILE_TYPES.map(tile => (
                    <button
                      key={tile.symbol}
                      onClick={() => setSelectedTile(tile.symbol)}
                      className={`px-4 py-2 rounded font-mono ${
                        selectedTile === tile.symbol 
                          ? 'ring-2 ring-blue-500 bg-gray-100' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      style={{ borderColor: tile.color, borderWidth: 2 }}
                    >
                      {tile.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Current State</h2>
              <div className="space-y-1 text-sm">
                <p>Player Position: Row {playerPos.row}, Col {playerPos.col}</p>
                <p>Dots Placed: {dots.length}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Actions</h2>
              <div className="flex gap-2">
                <button
                  onClick={clearMap}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Clear Map
                </button>
                <button
                  onClick={copyMapData}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Map Data'}
                </button>
              </div>
            </div>
          </div>

          {/* Map Preview */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">Map Preview</h2>
            <div className="bg-gray-50 p-4 rounded overflow-auto">
              <div className="inline-block">
                <MapRenderer map={currentMap} />
              </div>
            </div>
            
            {/* Click Grid Overlay */}
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2">Click to Edit</h3>
              <div 
                className="inline-grid gap-0 border-2 border-gray-300"
                style={{
                  gridTemplateColumns: `repeat(${width}, ${40}px)`,
                  gridTemplateRows: `repeat(${height}, ${40}px)`
                }}
              >
                {tiles.map((row, r) => 
                  row.map((tile, c) => (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleTileClick(r, c)}
                      className={`border border-gray-200 hover:bg-blue-100 hover:bg-opacity-50 text-xs font-mono
                        ${playerPos.row === r && playerPos.col === c ? 'bg-green-200' : ''}
                        ${dots.some(d => d.row === r && d.col === c) ? 'bg-yellow-200' : ''}
                      `}
                      style={{
                        backgroundColor: tile === '.' ? '#e5f3e5' : tile === '*' ? '#ffe4d1' : '#f5f5f5'
                      }}
                    >
                      {tile === ' ' ? '·' : tile}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}