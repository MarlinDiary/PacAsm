import { notFound } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

interface LevelPageProps {
  params: Promise<{ id: string }>
}

export default async function LevelPage({ params }: LevelPageProps) {
  const { id } = await params
  
  // Only allow level 1
  if (id !== '1') {
    notFound()
  }

  return (
    <div className="h-screen w-full" style={{ backgroundColor: '#f0f0f0' }}>
      <ResizablePanelGroup direction="horizontal">
        {/* First column with two panels */}
        <ResizablePanel defaultSize={33}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <div className="p-4 h-full bg-gray-50">
                Panel 1 - Level {id}
              </div>
            </ResizablePanel>
            <ResizableHandle className="opacity-0" />
            <ResizablePanel defaultSize={50}>
              <div className="p-4 h-full bg-gray-100">
                Panel 2 - Level {id}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        
        <ResizableHandle className="opacity-0" />
        
        {/* Second column */}
        <ResizablePanel defaultSize={34}>
          <div className="p-4 h-full bg-blue-50">
            Panel 3 - Level {id}
          </div>
        </ResizablePanel>
        
        <ResizableHandle className="opacity-0" />
        
        {/* Third column */}
        <ResizablePanel defaultSize={33}>
          <div className="p-4 h-full bg-green-50">
            Panel 4 - Level {id}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}