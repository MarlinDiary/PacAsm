'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import { 
  Plus, Minus, RotateCcw,
  User, Circle, Trees, Wind,
  Paintbrush,
  Settings, Code, 
  Clipboard, ClipboardCheck,
  ArrowRight, ArrowUp, ArrowLeft, ArrowDown,
  Crosshair,
  type LucideIcon
} from 'lucide-react'
import MapRenderer from '@/components/MapRenderer'
import WaterRenderer from '@/components/WaterRenderer'
import { GameMap, TileSymbol, PlayerDirection } from '@/data/maps'

const TILE_TYPES: { symbol: TileSymbol; name: string; icon: LucideIcon; color: string; bgColor: string }[] = [
  { symbol: '.', name: 'Grass', icon: Trees, color: '#22c55e', bgColor: '#dcfce7' },
  { symbol: ' ', name: 'Air', icon: Wind, color: '#94a3b8', bgColor: '#f1f5f9' }
]

const TOOLS = [
  { id: 'tile', name: 'Paint Tile', icon: Paintbrush },
  { id: 'player', name: 'Set Player', icon: User },
  { id: 'dot', name: 'Place Dots', icon: Circle }
]

const PLAYER_DIRECTIONS: { dir: PlayerDirection; icon: LucideIcon; name: string }[] = [
  { dir: 'right', icon: ArrowRight, name: 'Right' },
  { dir: 'up', icon: ArrowUp, name: 'Up' },
  { dir: 'left', icon: ArrowLeft, name: 'Left' },
  { dir: 'down', icon: ArrowDown, name: 'Down' }
]

type Tool = 'tile' | 'player' | 'dot'

type HistoryState = {
  tiles: TileSymbol[][]
  playerPos: { row: number; col: number }
  playerDirection: PlayerDirection
  dots: { row: number; col: number }[]
  levelNumber: number
  width: number
  height: number
}

export default function MapEditor() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  // Map properties
  const [levelNumber, setLevelNumber] = useState(1)
  const [width, setWidth] = useState(5)
  const [height, setHeight] = useState(5)
  const [tileSize, setTileSize] = useState(64)
  const [tiles, setTiles] = useState<TileSymbol[][]>(() => 
    Array(height).fill(null).map(() => Array(width).fill(' '))
  )
  
  // Game elements
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 })
  const [playerDirection, setPlayerDirection] = useState<PlayerDirection>('right')
  const [dots, setDots] = useState<{ row: number; col: number }[]>([])
  
  // Water background
  const [waterTilesX, setWaterTilesX] = useState(35)
  const [waterTilesY, setWaterTilesY] = useState(35)
  
  // Code
  const [initialCode, setInitialCode] = useState(`LDR   R0, =0x00030000
MOV   R1, #4
STR   R1, [R0]`)
  
  // Editor state
  const [selectedTool, setSelectedTool] = useState<Tool>('tile')
  const [selectedTile, setSelectedTile] = useState<TileSymbol>('.')
  const [copied, setCopied] = useState(false)
  const [showGrid] = useState(true)
  
  // History
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDragging, setIsDragging] = useState(false)
  
  // Panel states
  const [activeTab, setActiveTab] = useState<'settings' | 'code'>('settings')
  
  // Canvas scroll ref
  const canvasRef = useRef<HTMLDivElement>(null)


  // Save state to history
  const saveToHistory = useCallback(() => {
    const newState = { 
      tiles: JSON.parse(JSON.stringify(tiles)), 
      playerPos: {...playerPos}, 
      playerDirection,
      dots: [...dots],
      levelNumber,
      width,
      height
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    // Limit history to 50 states
    if (newHistory.length > 50) newHistory.shift()
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [tiles, playerPos, playerDirection, dots, levelNumber, width, height, history, historyIndex])

  // Initialize first history state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory()
    }
  }, [history.length, saveToHistory])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Cmd+Shift+Z for redo
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, history.length])

  // Center view function
  const centerView = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const scrollWidth = canvas.scrollWidth
      const scrollHeight = canvas.scrollHeight
      const clientWidth = canvas.clientWidth
      const clientHeight = canvas.clientHeight
      
      canvas.scrollLeft = (scrollWidth - clientWidth) / 2
      canvas.scrollTop = (scrollHeight - clientHeight) / 2
    }
  }, [])

  // Auto-center on mount and when dimensions change
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(centerView, 100)
    return () => clearTimeout(timer)
  }, [waterTilesX, waterTilesY, width, height, tileSize, centerView])

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      applyHistoryState(prevState)
      setHistoryIndex(historyIndex - 1)
    }
  }

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      applyHistoryState(nextState)
      setHistoryIndex(historyIndex + 1)
    }
  }
  
  const applyHistoryState = (state: HistoryState) => {
    setTiles(JSON.parse(JSON.stringify(state.tiles)))
    setPlayerPos({...state.playerPos})
    setPlayerDirection(state.playerDirection)
    setDots([...state.dots])
    setLevelNumber(state.levelNumber)
    setWidth(state.width)
    setHeight(state.height)
  }

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
    saveToHistory()
  }


  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    
    // Handle the initial click
    if (selectedTool === 'tile') {
      const newTiles = [...tiles]
      newTiles[row][col] = selectedTile
      setTiles(newTiles)
    } else if (selectedTool === 'player') {
      setPlayerPos({ row, col })
    } else if (selectedTool === 'dot') {
      const existingDotIndex = dots.findIndex(d => d.row === row && d.col === col)
      if (existingDotIndex >= 0) {
        setDots(dots.filter((_, i) => i !== existingDotIndex))
      } else {
        setDots([...dots, { row, col }])
      }
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      saveToHistory()
    }
  }

  const handleMouseEnter = (row: number, col: number, e: React.MouseEvent) => {
    if (isDragging) {
      if (selectedTool === 'tile') {
        const newTiles = [...tiles]
        newTiles[row][col] = selectedTile
        setTiles(newTiles)
      } else if (selectedTool === 'dot') {
        // Add dots while dragging
        const existingDotIndex = dots.findIndex(d => d.row === row && d.col === col)
        if (existingDotIndex < 0) {
          setDots([...dots, { row, col }])
        }
      }
    }
  }

  const clearMap = () => {
    setTiles(Array(height).fill(null).map(() => Array(width).fill(' ')))
    setDots([])
    setPlayerPos({ row: 0, col: 0 })
    saveToHistory()
  }

  const generateMapData = (): GameMap => {
    return {
      id: `level${levelNumber}`,
      name: `Level ${levelNumber}`,
      width,
      height,
      tileSize,
      tiles,
      playerPosition: {
        row: playerPos.row,
        col: playerPos.col,
        direction: playerDirection
      },
      dots: dots.length > 0 ? dots : undefined,
      waterBackground: { tilesX: waterTilesX, tilesY: waterTilesY },
      initialCode
    }
  }

  const copyMapData = () => {
    const mapData = generateMapData()
    const mapString = `{
  id: '${mapData.id}',
  name: '${mapData.name}',
  width: ${mapData.width},
  height: ${mapData.height},
  tileSize: ${mapData.tileSize},
  tiles: [
${mapData.tiles.map(row => `    ['${row.join("', '")}']`).join(',\n')}
  ],
  playerPosition: { row: ${mapData.playerPosition?.row}, col: ${mapData.playerPosition?.col}, direction: '${mapData.playerPosition?.direction}' },
  dots: [${mapData.dots?.map(d => `{ row: ${d.row}, col: ${d.col} }`).join(', ') || ''}],
  waterBackground: { tilesX: ${waterTilesX}, tilesY: ${waterTilesY} },
  initialCode: \`${initialCode}\`
}`
    
    navigator.clipboard.writeText(mapString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentMap = generateMapData()

  return (
    <div className="h-screen bg-black text-white flex flex-col" onMouseUp={handleMouseUp}>
      {/* Header Bar - Apple Style */}
      <div className="bg-zinc-900/50 backdrop-blur-xl border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-1.5 border border-white/5">
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Level</span>
              <input
                type="number"
                value={levelNumber}
                onChange={(e) => setLevelNumber(parseInt(e.target.value) || 1)}
                className="bg-transparent text-white font-medium w-12 text-center focus:outline-none"
                min="1"
                max="999"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={centerView}
              className="p-2 bg-white/10 hover:bg-white/15 rounded-lg transition-all border border-white/10"
              title="Center View"
            >
              <Crosshair size={16} className="text-zinc-300" />
            </button>
            <button
              onClick={copyMapData}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg flex items-center gap-2 transition-all text-sm font-medium border border-white/10"
              title="Copy Code"
            >
              {copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Apple Style */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border-r border-white/10 w-72">
          <div className="p-5 space-y-6 h-full overflow-y-auto">
            {/* Tools */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id as Tool)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all border ${
                      selectedTool === tool.id 
                        ? 'bg-white/10 text-white border-white/20 shadow-lg' 
                        : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-white/5'
                    }`}
                    title={tool.name}
                  >
                    <tool.icon size={18} />
                    <span className="text-xs font-medium">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Selection */}
            {selectedTool === 'tile' && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tile Type</h3>
                <div className="space-y-1.5">
                  {TILE_TYPES.map((tile) => (
                    <button
                      key={tile.symbol}
                      onClick={() => setSelectedTile(tile.symbol)}
                      className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all border ${
                        selectedTile === tile.symbol 
                          ? 'bg-zinc-800 border-white/20 shadow-md' 
                          : 'bg-zinc-800/30 hover:bg-zinc-800/50 border-white/5'
                      }`}
                    >
                      <tile.icon size={16} style={{ color: tile.color }} />
                      <span className="flex-1 text-left text-sm font-medium">{tile.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Player Direction */}
            {selectedTool === 'player' && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Direction</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLAYER_DIRECTIONS.map(dir => (
                    <button
                      key={dir.dir}
                      onClick={() => setPlayerDirection(dir.dir)}
                      className={`p-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border ${
                        playerDirection === dir.dir
                          ? 'bg-white/10 text-white border-white/20 shadow-lg'
                          : 'bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-400 border-white/5'
                      }`}
                    >
                      <dir.icon size={14} />
                      <span className="text-xs font-medium">{dir.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Map */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={clearMap}
                className="w-full px-3 py-2.5 bg-zinc-800/30 hover:bg-red-500/20 rounded-lg flex items-center justify-center gap-2 transition-all border border-white/5 hover:border-red-500/50 text-zinc-400 hover:text-red-400"
              >
                <RotateCcw size={14} />
                <span className="text-sm font-medium">Clear Map</span>
              </button>
            </div>

          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          className="flex-1 bg-zinc-950 relative overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >

          {/* Map Canvas */}
          <div className="min-h-full flex items-center justify-center p-8" style={{
            minWidth: Math.max(waterTilesX * tileSize, width * tileSize) + 64,
            minHeight: Math.max(waterTilesY * tileSize, height * tileSize) + 64
          }}>
            <div className="relative" style={{
              width: Math.max(waterTilesX * tileSize, width * tileSize),
              height: Math.max(waterTilesY * tileSize, height * tileSize)
            }}>
              {/* Water Background */}
              <div className="absolute inset-0">
                <WaterRenderer tilesX={waterTilesX} tilesY={waterTilesY} tileSize={tileSize} />
              </div>
              
              {/* Render the actual map - centered */}
              <div className="absolute" style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: width * tileSize,
                height: height * tileSize
              }}>
                <MapRenderer map={currentMap} />
              
                
                {/* Clickable overlay grid */}
                <div 
                  className="absolute top-0 left-0 inline-grid z-20"
                  style={{
                    gridTemplateColumns: `repeat(${width}, ${tileSize}px)`,
                    gridTemplateRows: `repeat(${height}, ${tileSize}px)`,
                    gap: 0
                  }}
                >
                  {tiles.map((row, r) => 
                    row.map((tile, c) => (
                      <button
                        key={`${r}-${c}`}
                        onMouseDown={(e) => handleMouseDown(r, c, e)}
                        onMouseEnter={(e) => handleMouseEnter(r, c, e)}
                        className={`relative ${
                          showGrid && tile !== ' ' ? 'border border-gray-700 border-opacity-30' : ''
                        }`}
                        style={{
                          width: tileSize,
                          height: tileSize
                        }}
                      >
                        {/* Air tile indicator */}
                        {tile === ' ' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Wind className="text-gray-400 opacity-30" size={Math.min(tileSize * 0.5, 24)} />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Apple Style */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border-l border-white/10 w-80">
          <div className="flex flex-col h-full">
            {/* Segmented Control */}
            <div className="p-3 border-b border-white/10">
              <div className="flex bg-zinc-800/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'settings' 
                      ? 'bg-zinc-700 text-white shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'code' 
                      ? 'bg-zinc-700 text-white shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Code size={14} />
                  Code
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'settings' && (
                <div className="space-y-5">
                  {/* Map Dimensions */}
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Dimensions</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Width</label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button 
                            onClick={() => resizeMap(Math.max(1, width - 1), height)}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Minus size={12} className="text-zinc-400" />
                          </button>
                          <input 
                            type="number" 
                            value={width} 
                            onChange={(e) => resizeMap(parseInt(e.target.value) || 1, height)}
                            className="flex-1 bg-zinc-800/30 text-center border border-white/5 rounded-lg px-2 py-1.5 text-sm font-medium focus:border-white/20 focus:outline-none focus:bg-zinc-800/50"
                            min="1"
                            max="20"
                          />
                          <button 
                            onClick={() => resizeMap(Math.min(20, width + 1), height)}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Plus size={12} className="text-zinc-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Height</label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button 
                            onClick={() => resizeMap(width, Math.max(1, height - 1))}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Minus size={12} className="text-zinc-400" />
                          </button>
                          <input 
                            type="number" 
                            value={height} 
                            onChange={(e) => resizeMap(width, parseInt(e.target.value) || 1)}
                            className="flex-1 bg-zinc-800/30 text-center border border-white/5 rounded-lg px-2 py-1.5 text-sm font-medium focus:border-white/20 focus:outline-none focus:bg-zinc-800/50"
                            min="1"
                            max="20"
                          />
                          <button 
                            onClick={() => resizeMap(width, Math.min(20, height + 1))}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Plus size={12} className="text-zinc-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium flex items-center justify-between">
                          Tile Size
                          <span className="text-zinc-300 font-mono text-xs">{tileSize}px</span>
                        </label>
                        <input 
                          type="range" 
                          value={tileSize} 
                          onChange={(e) => setTileSize(parseInt(e.target.value))}
                          className="w-full mt-2 accent-white/50"
                          min="32"
                          max="128"
                          step="4"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Water Background Settings */}
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Background</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Water Tiles X</label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button 
                            onClick={() => setWaterTilesX(Math.max(10, waterTilesX - 1))}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Minus size={12} className="text-zinc-400" />
                          </button>
                          <input 
                            type="number" 
                            value={waterTilesX} 
                            onChange={(e) => setWaterTilesX(parseInt(e.target.value) || 10)}
                            className="flex-1 bg-zinc-800/30 text-center border border-white/5 rounded-lg px-2 py-1.5 text-sm font-medium focus:border-white/20 focus:outline-none focus:bg-zinc-800/50"
                            min="10"
                            max="50"
                          />
                          <button 
                            onClick={() => setWaterTilesX(Math.min(50, waterTilesX + 1))}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Plus size={12} className="text-zinc-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-medium">Water Tiles Y</label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button 
                            onClick={() => setWaterTilesY(Math.max(10, waterTilesY - 1))}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Minus size={12} className="text-zinc-400" />
                          </button>
                          <input 
                            type="number" 
                            value={waterTilesY} 
                            onChange={(e) => setWaterTilesY(parseInt(e.target.value) || 10)}
                            className="flex-1 bg-zinc-800/30 text-center border border-white/5 rounded-lg px-2 py-1.5 text-sm font-medium focus:border-white/20 focus:outline-none focus:bg-zinc-800/50"
                            min="10"
                            max="50"
                          />
                          <button 
                            onClick={() => setWaterTilesY(Math.min(50, waterTilesY + 1))}
                            className="p-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5"
                          >
                            <Plus size={12} className="text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'code' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Initial Code</label>
                    <textarea
                      value={initialCode}
                      onChange={(e) => setInitialCode(e.target.value)}
                      className="w-full h-32 bg-zinc-800/30 border border-white/5 rounded-lg px-3 py-2.5 text-sm font-mono focus:border-white/20 focus:outline-none focus:bg-zinc-800/50 text-zinc-100 placeholder-zinc-600"
                      placeholder="Enter ARM assembly code..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}