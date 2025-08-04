'use client'

import { notFound } from 'next/navigation'
import { useRef } from 'react'
import { useParams } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ImperativePanelHandle } from 'react-resizable-panels'
import Card from '@/components/Card'
import ExecutionBar from '@/components/ExecutionBar'
import { Gamepad2, Move, CodeXml, CircuitBoard, HardDrive } from 'lucide-react'

export default function LevelPage() {
  const params = useParams()
  const id = params.id as string
  
  // Only allow level 1
  if (id !== '1') {
    notFound()
  }

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
        <div className="flex justify-center">
          <ExecutionBar />
        </div>
        <div className="flex-1 pt-2">
        <ResizablePanelGroup direction="horizontal">
        {/* First column with two panels */}
        <ResizablePanel defaultSize={33} ref={firstColumnRef} minSize={10}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60} ref={panel1Ref} minSize={10}>
              <Card tabs={[{ icon: Gamepad2, text: "Game", color: "#3579f6" }]} />
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
          <Card tabs={[{ icon: CodeXml, text: "Code", color: "#4fae40" }]} />
        </ResizablePanel>
        
        <ResizableHandle 
          style={{ width: '8px' }}
          onDoubleClick={resetHorizontalPanels}
        />
        
        {/* Third column */}
        <ResizablePanel defaultSize={33} ref={panel4Ref} minSize={10}>
          <Card tabs={[
            { icon: CircuitBoard, text: "Register", color: "#633dbf" },
            { icon: HardDrive, text: "Memory", color: "#01A2C2" }
          ]} />
        </ResizablePanel>
        </ResizablePanelGroup>
        </div>
      </div>
    </div>
  )
}