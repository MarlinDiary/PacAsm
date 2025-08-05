'use client'

import { notFound } from 'next/navigation'
import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ImperativePanelHandle } from 'react-resizable-panels'
import Card from '@/components/Card'
import ExecutionBar from '@/components/ExecutionBar'
import DebuggerBar from '@/components/DebuggerBar'
import IconButton from '@/components/IconButton'
import MapRenderer from '@/components/MapRenderer'
import WaterRenderer from '@/components/WaterRenderer'
import CodeEditor from '@/components/CodeEditor'
import RegisterPanel from '@/components/RegisterPanel'
import { getMapByLevel } from '@/data/maps'
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

  // Panel refs for resetting
  const firstColumnRef = useRef<ImperativePanelHandle>(null)
  const panel1Ref = useRef<ImperativePanelHandle>(null)
  const panel2Ref = useRef<ImperativePanelHandle>(null)
  const panel3Ref = useRef<ImperativePanelHandle>(null)
  const panel4Ref = useRef<ImperativePanelHandle>(null)

  const resetVerticalPanels = () => {
    panel1Ref.current?.resize(60)
    panel2Ref.current?.resize(40)
  }

  const resetHorizontalPanels = () => {
    firstColumnRef.current?.resize(33)
    panel3Ref.current?.resize(34)
    panel4Ref.current?.resize(33)
  }

  return (
    <div className="h-screen w-full" style={{ backgroundColor: '#f0f0f0' }}>
      <div className="p-2 h-full flex flex-col">
        <div className="flex justify-center relative">
          <div className="absolute left-0 top-0">
            <IconButton icon={ArrowLeft} />
          </div>
          <div className="relative">
            <ExecutionBar 
              onDebugClick={() => setIsDebugMode(true)} 
              isDebugMode={isDebugMode}
            />
            <div className={`absolute inset-0 transition-opacity duration-200 ${isDebugMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <DebuggerBar onReturnClick={() => setIsDebugMode(false)} />
            </div>
          </div>
          <div className="absolute right-0 top-0">
            <IconButton icon={Settings2} />
          </div>
        </div>
        <div className="flex-1 pt-2">
        <ResizablePanelGroup direction="horizontal">
        {/* First column with two panels */}
        <ResizablePanel defaultSize={33} ref={firstColumnRef} minSize={10}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60} ref={panel1Ref} minSize={10}>
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
            <ResizablePanel defaultSize={40} ref={panel2Ref} minSize={10}>
              <Card tabs={[{ icon: Move, text: "Actuator", color: "#f4ba40" }]} />
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
            <CodeEditor />
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
              <RegisterPanel key="register" />,
              <div key="memory" className="p-4">Memory content coming soon...</div>
            ]}
          />
        </ResizablePanel>
        </ResizablePanelGroup>
        </div>
      </div>
    </div>
  )
}