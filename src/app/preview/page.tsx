'use client'

import { notFound } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import CodeEditor from '@/components/CodeEditor'
import { useState } from 'react'

export default function PreviewPage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  const [assemblyCode, setAssemblyCode] = useState(`; Assembly Language Example
section .data
    msg db 'Hello, World!', 0
    msg_len equ $ - msg

section .text
    global _start

_start:
    ; write system call
    mov eax, 4          ; sys_write
    mov ebx, 1          ; stdout
    mov ecx, msg        ; message to write
    mov edx, msg_len    ; message length
    int 0x80            ; call kernel

    ; exit system call
    mov eax, 1          ; sys_exit
    mov ebx, 0          ; exit status
    int 0x80            ; call kernel`)

  return (
    <div className="h-screen w-full p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Component Preview</h1>
        <p className="text-neutral-600">This page is only available in development mode</p>
      </div>
      
      <div className="h-[calc(100vh-8rem)] w-full border-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left panel - Code Editor */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-neutral-50">
              <div className="p-3 border-b border-neutral-200 flex-shrink-0">
                <h3 className="text-lg font-medium">Assembly Code Editor</h3>
              </div>
              <div className="flex-1 p-2 min-h-0">
                <CodeEditor
                  value={assemblyCode}
                  onChange={(value) => setAssemblyCode(value || '')}
                  height="100%"
                  className="border border-neutral-200 rounded"
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right side with two vertical panels */}
          <ResizablePanel defaultSize={50}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex items-center justify-center bg-blue-50 text-lg font-medium">
                  Output Panel
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex items-center justify-center bg-green-50 text-lg font-medium">
                  Debug Panel
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
} 