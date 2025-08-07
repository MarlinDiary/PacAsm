'use client'

import { notFound } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
import { CodeHighlighter, createHighlighter, getHighlightFromStepResult } from '@/lib/highlighter'
import { ARMAssembler } from '@/lib/assembler'
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
  
  // Debugging state
  const emulator = useEmulator()
  const [highlighter, setHighlighter] = useState<CodeHighlighter | null>(null)
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined)
  
  // State for memory search
  const [memorySearchQuery, setMemorySearchQuery] = useState('')
  
  // State for memory filter
  const [hideZeroRows, setHideZeroRows] = useState(false)

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

  const handlePlayClick = () => {
    setIsCodeDisabled(true)
  }

  const handleDebugClick = async () => {
    setIsDebugMode(true)
    setIsCodeDisabled(true)
    
    try {
      if (!emulator.state.isInitialized) {
        await emulator.initializeEmulator()
      }
      
      const sourceCode = levelMap.initialCode || ''
      const codeHighlighter = await createHighlighter(sourceCode)
      setHighlighter(codeHighlighter)
      
      const assembler = new ARMAssembler()
      await assembler.initialize()
      const result = await assembler.assemble(sourceCode)
      await emulator.loadCode(Array.from(result.mc))
      
      setHighlightedLine(undefined)
      assembler.destroy()
    } catch (error) {
      console.error('Debug initialization failed:', error)
    }
  }

  const handleStepDown = async () => {
    if (!highlighter) return
    
    try {
      const stepResult = await emulator.step()
      if (stepResult) {
        const highlight = getHighlightFromStepResult(stepResult, highlighter)
        setHighlightedLine(highlight?.lineNumber)
      }
    } catch (error) {
      console.error('Step down failed:', error)
    }
  }

  const handleStepUp = async () => {
    // TODO: Implement step up functionality
  }

  const handleStopClick = async () => {
    setIsCodeDisabled(false)
    setIsDebugMode(false)
    setHighlightedLine(undefined)
    
    try {
      await emulator.reset()
    } catch (error) {
      console.error('Stop failed:', error)
    }
  }

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
            />
            <div className={`absolute inset-0 transition-opacity duration-200 ${isDebugMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <DebuggerBar 
                onReturnClick={() => setIsDebugMode(false)} 
                onStopClick={handleStopClick}
                onStepDown={handleStepDown}
                onStepUp={handleStepUp}
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
                  {levelMap.waterBackground && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <WaterRenderer 
                          tilesX={levelMap.waterBackground.tilesX} 
                          tilesY={levelMap.waterBackground.tilesY}
                        />
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <MapRenderer map={levelMap} />
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
              value={levelMap.initialCode || ''} 
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
                  <RegisterPanel />
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