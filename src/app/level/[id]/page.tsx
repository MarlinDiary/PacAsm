'use client'

import { notFound } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Confetti from 'react-confetti'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ImperativePanelHandle } from 'react-resizable-panels'
import Card from '@/components/Card'
import ExecutionBar from '@/components/bar/ExecutionBar'
import DebuggerBar from '@/components/bar/DebuggerBar'
import IconButton from '@/components/IconButton'
import MapRenderer from '@/components/MapRenderer'
import WaterRenderer from '@/components/WaterRenderer'
import CodeEditor from '@/components/CodeEditor'
import RegisterPanel from '@/components/panel/RegisterPanel'
import MemoryPanel from '@/components/panel/MemoryPanel'
import SubBar from '@/components/bar/SubBar'
import QueryBar from '@/components/bar/QueryBar'
import ActuatorBar from '@/components/bar/ActuatorBar'
import ActuatorPanel from '@/components/panel/ActuatorPanel'
import { getMapByLevel } from '@/data/maps'
import { useEmulator } from '@/hooks/useEmulator'
import { useDebugPlayback } from '@/hooks/useDebugPlayback'
import { Gamepad2, Move, CodeXml, CircuitBoard, HardDrive, Settings2, ArrowLeft } from 'lucide-react'

export default function LevelPage() {
  const params = useParams()
  const id = params.id as string
  
  // Only allow level 1
  if (id !== '1') {
    notFound()
  }

  // Load the map for this level
  const levelMap = getMapByLevel(id)
  if (!levelMap) {
    notFound()
  }

  // State for toggling between ExecutionBar and DebuggerBar
  const [isDebugMode, setIsDebugMode] = useState(false)
  
  // State for code editor disabled
  const [isCodeDisabled, setIsCodeDisabled] = useState(false)
  
  // State for play mode
  const [isPlayMode, setIsPlayMode] = useState(false)
  const [playStatus, setPlayStatus] = useState<'pending' | 'running'>('pending')
  const [hasWon, setHasWon] = useState(false) // Ever won (permanent)
  const [currentPlayWon, setCurrentPlayWon] = useState(false) // This play won (temporary)
  
  // State for current code content
  const [currentCode, setCurrentCode] = useState(levelMap.initialCode || '')
  
  // Debugging state
  const emulator = useEmulator()
  const debugPlayback = useDebugPlayback(levelMap)
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined)
  
  // State for memory search
  const [memorySearchQuery, setMemorySearchQuery] = useState('')
  
  // State for memory filter
  const [hideZeroRows, setHideZeroRows] = useState(false)
  
  // Game map state for player movement
  const [currentMap, setCurrentMap] = useState(levelMap)

  // Panel refs for resetting
  const firstColumnRef = useRef<ImperativePanelHandle>(null)
  const panel1Ref = useRef<ImperativePanelHandle>(null)
  const panel2Ref = useRef<ImperativePanelHandle>(null)
  const panel3Ref = useRef<ImperativePanelHandle>(null)
  const panel4Ref = useRef<ImperativePanelHandle>(null)

  const resetVerticalPanels = () => {
    panel1Ref.current?.resize(70)
    panel2Ref.current?.resize(30)
  }

  const resetHorizontalPanels = () => {
    firstColumnRef.current?.resize(33)
    panel3Ref.current?.resize(34)
    panel4Ref.current?.resize(33)
  }

  // Cleanup emulator on unmount
  useEffect(() => {
    return () => {
      emulator.cleanup()
    }
  }, [emulator.cleanup])

  const handlePlayClick = async () => {
    // Reset map to initial state before starting play
    setCurrentMap(levelMap)
    setHighlightedLine(undefined)
    setCurrentPlayWon(false) // Reset current play victory status
    // Don't clear hasWon - keep Next button permanently after first victory
    
    setIsCodeDisabled(true)
    setIsPlayMode(true)
    setPlayStatus('pending') // Show "Pending..." during compilation
    
    const result = await debugPlayback.startPlay(currentCode, levelMap) // Use levelMap instead of currentMap
    if (result.success && result.initialState) {
      setCurrentMap(result.initialState.mapState)
      setHighlightedLine(result.initialState.highlightedLine)
      setPlayStatus('running') // Switch to "Running..." when playback starts
    }
  }

  const handleDebugClick = async () => {
    // Reset map to initial state before starting debug
    setCurrentMap(levelMap)
    setHighlightedLine(undefined)
    // Don't clear hasWon - keep Next button permanently after first victory
    
    setIsDebugMode(true)
    setIsCodeDisabled(true)
    
    const result = await debugPlayback.startDebug(currentCode, levelMap) // Use levelMap instead of currentMap
    if (result.success && result.initialState) {
      setCurrentMap(result.initialState.mapState)
      setHighlightedLine(result.initialState.highlightedLine)
    }
  }

  const handleStepDown = () => {
    const nextState = debugPlayback.stepDown()
    if (nextState) {
      setCurrentMap(nextState.mapState)
      setHighlightedLine(nextState.highlightedLine)
    }
  }

  const handleStepUp = () => {
    const prevState = debugPlayback.stepUp()
    if (prevState) {
      setCurrentMap(prevState.mapState)
      setHighlightedLine(prevState.highlightedLine)
    }
  }

  const handleStopClick = async () => {
    setIsCodeDisabled(false)
    setIsDebugMode(false)
    setHighlightedLine(undefined)
    setCurrentMap(levelMap) // Reset map to initial state when stopping debug
    
    await debugPlayback.reset()
  }

  const handleReplay = () => {
    const firstState = debugPlayback.replay()
    if (firstState) {
      setCurrentMap(firstState.mapState)
      setHighlightedLine(firstState.highlightedLine)
    }
  }

  // Get current and previous debug states for panels
  const currentDebugState = debugPlayback.getCurrentState()
  const previousDebugState = debugPlayback.getPreviousState()

  // Listen for playback updates during play mode
  useEffect(() => {
    const state = debugPlayback.getCurrentState()
    if (state && debugPlayback.isPlaying) {
      setCurrentMap(state.mapState)
      setHighlightedLine(state.highlightedLine)
      
      // Check victory condition only during play mode
      if (isPlayMode && state.mapState.dots && state.mapState.dots.length === 0) {
        setHasWon(true) // Permanent victory status
        setCurrentPlayWon(true) // This play victory status
      }
    }
  }, [debugPlayback.currentPlaybackIndex, debugPlayback.isPlaying, isPlayMode])

  // Listen for play completion
  useEffect(() => {
    if (isPlayMode && !debugPlayback.isPlaying && debugPlayback.executionHistory.length > 0) {
      // Play has finished - reset everything
      setTimeout(() => {
        debugPlayback.reset()
        setIsPlayMode(false)
        setIsCodeDisabled(false)
        setHighlightedLine(undefined)
        // Reset map if this play didn't win, keep victory state if this play won
        if (!currentPlayWon) {
          setCurrentMap(levelMap)
        }
        // Don't reset playStatus - let it stay as 'running' until next play starts
      }, 500) // Small delay to show final state briefly
    }
  }, [debugPlayback.isPlaying, isPlayMode, debugPlayback.executionHistory.length, debugPlayback, currentPlayWon, levelMap])

  return (
    <div className="h-screen w-full overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
      <div className="p-2 h-full flex flex-col">
        <div className="flex justify-center relative">
          <div className="absolute left-0 top-0">
            <IconButton icon={ArrowLeft} />
          </div>
          <div className="relative">
            <ExecutionBar 
              onDebugClick={handleDebugClick}
              onPlayClick={handlePlayClick}
              isDebugMode={isDebugMode}
              isPlayMode={isPlayMode}
              playStatus={playStatus}
              hasWon={hasWon}
            />
            <div className={`absolute inset-0 transition-opacity duration-200 ${isDebugMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <DebuggerBar 
                onReturnClick={() => setIsDebugMode(false)} 
                onStopClick={handleStopClick}
                onStepDown={handleStepDown}
                onStepUp={handleStepUp}
                onReplay={handleReplay}
                canStepUp={debugPlayback.canStepUp}
                canStepDown={debugPlayback.canStepDown}
              />
            </div>
          </div>
          <div className="absolute right-0 top-0">
            <IconButton icon={Settings2} />
          </div>
        </div>
        <div className="flex-1 pt-2 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* First column with two panels */}
        <ResizablePanel defaultSize={33} ref={firstColumnRef} minSize={10}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={70} ref={panel1Ref} minSize={10}>
              <Card tabs={[{ icon: Gamepad2, text: "Game", color: "#3579f6" }]}>
                <div className="w-full h-full relative overflow-hidden">
                  {currentPlayWon && (
                    <div className="absolute inset-0 z-20">
                      <Confetti
                        recycle={false}
                        numberOfPieces={500}
                        wind={0.05}
                        gravity={0.25}
                      />
                    </div>
                  )}
                  {levelMap.waterBackground && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <WaterRenderer 
                          tilesX={levelMap.waterBackground.tilesX} 
                          tilesY={levelMap.waterBackground.tilesY}
                        />
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <MapRenderer map={currentMap} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </ResizablePanel>
            <ResizableHandle 
              style={{ height: '8px' }}
              onDoubleClick={resetVerticalPanels}
            />
            <ResizablePanel defaultSize={30} ref={panel2Ref} minSize={10}>
              <Card tabs={[{ icon: Move, text: "Actuator", color: "#f4ba40" }]}>
                <div className="h-full flex flex-col">
                  <ActuatorBar />
                  <div 
                    className="flex-1 overflow-y-auto"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <ActuatorPanel />
                  </div>
                </div>
              </Card>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        
        <ResizableHandle 
          style={{ width: '8px' }}
          onDoubleClick={resetHorizontalPanels}
        />
        
        {/* Second column */}
        <ResizablePanel defaultSize={34} ref={panel3Ref} minSize={10}>
          <Card tabs={[{ icon: CodeXml, text: "Code", color: "#4fae40" }]}>
            <CodeEditor 
              value={currentCode} 
              onChange={(value) => setCurrentCode(value || '')}
              disabled={isCodeDisabled}
              highlightedLine={highlightedLine}
            />
          </Card>
        </ResizablePanel>
        
        <ResizableHandle 
          style={{ width: '8px' }}
          onDoubleClick={resetHorizontalPanels}
        />
        
        {/* Third column */}
        <ResizablePanel defaultSize={33} ref={panel4Ref} minSize={10}>
          <Card 
            tabs={[
              { icon: CircuitBoard, text: "Register", color: "#633dbf" },
              { icon: HardDrive, text: "Memory", color: "#01A2C2" }
            ]}
            tabContent={[
              <div key="register" className="h-full flex flex-col">
                <SubBar>
                  <div className="w-1/4 text-center" style={{ color: '#8a8a8e', fontSize: '14px' }}>Reg</div>
                  <div className="w-1/2 text-center" style={{ color: '#8a8a8e', fontSize: '14px' }}>Hex</div>
                  <div className="w-1/4 text-center" style={{ color: '#8a8a8e', fontSize: '14px' }}>Dec</div>
                </SubBar>
                <div 
                  className="flex-1 overflow-y-auto"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  <RegisterPanel 
                    registers={currentDebugState?.registers} 
                    previousRegisters={previousDebugState?.registers}
                  />
                </div>
              </div>,
              <div key="memory" className="h-full flex flex-col">
                <QueryBar 
                  onSearch={setMemorySearchQuery} 
                  onFilterToggle={setHideZeroRows}
                />
                <div 
                  className="flex-1 overflow-y-auto"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  <MemoryPanel 
                    searchQuery={memorySearchQuery} 
                    hideZeroRows={hideZeroRows}
                    codeMemory={currentDebugState?.codeMemory}
                    stackMemory={currentDebugState?.stackMemory}
                    dataMemory={currentDebugState?.dataMemory}
                  />
                </div>
              </div>
            ]}
          />
        </ResizablePanel>
        </ResizablePanelGroup>
        </div>
      </div>
    </div>
  )
}