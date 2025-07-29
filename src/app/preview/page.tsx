import { notFound } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

export default function PreviewPage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <div className="h-screen w-full p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Component Preview</h1>
        <p className="text-gray-600">This page is only available in development mode</p>
      </div>
      
      <div className="h-[600px] w-full border-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left panel */}
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full flex items-center justify-center bg-slate-50 text-lg font-medium">
              One
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right side with two vertical panels */}
          <ResizablePanel defaultSize={70}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex items-center justify-center bg-blue-50 text-lg font-medium">
                  Two
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex items-center justify-center bg-green-50 text-lg font-medium">
                  Three
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
} 