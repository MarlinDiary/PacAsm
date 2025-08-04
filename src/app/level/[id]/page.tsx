'use client'

import { notFound } from 'next/navigation'
import { useRef } from 'react'
import { useParams } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ImperativePanelHandle } from 'react-resizable-panels'

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
      <div className="p-2 h-full">
        <ResizablePanelGroup direction="horizontal">
        {/* First column with two panels */}
        <ResizablePanel defaultSize={33} ref={firstColumnRef}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60} ref={panel1Ref}>
              <div className="p-4 h-full bg-gray-50">
                Panel 1 - Level {id}
              </div>
            </ResizablePanel>
            <ResizableHandle 
              style={{ height: '8px' }}
              onDoubleClick={resetVerticalPanels}
            />
            <ResizablePanel defaultSize={40} ref={panel2Ref}>
              <div className="p-4 h-full bg-gray-100">
                Panel 2 - Level {id}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        
        <ResizableHandle 
          style={{ width: '8px' }}
          onDoubleClick={resetHorizontalPanels}
        />
        
        {/* Second column */}
        <ResizablePanel defaultSize={34} ref={panel3Ref}>
          <div className="p-4 h-full bg-blue-50">
            Panel 3 - Level {id}
          </div>
        </ResizablePanel>
        
        <ResizableHandle 
          style={{ width: '8px' }}
          onDoubleClick={resetHorizontalPanels}
        />
        
        {/* Third column */}
        <ResizablePanel defaultSize={33} ref={panel4Ref}>
          <div className="p-4 h-full bg-green-50">
            Panel 4 - Level {id}
          </div>
        </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}