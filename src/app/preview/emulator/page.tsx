'use client'

import { notFound } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import CodeEditor from '@/components/CodeEditor'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ARMAssembler, AssemblerOptions } from '@/lib/assembler'
import { ARMEmulator, formatRegisters, formatMemory, formatStepResult } from '@/lib/emulator'
import { CodeHighlighter, createHighlighter, getHighlightFromStepResult } from '@/lib/highlighter'

export default function EmulatorPage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  const [assemblyCode, setAssemblyCode] = useState(`mov r0, #0        @ Initialize counter
mov r1, #0        @ Initialize sum
loop:
add r1, r1, r0    @ sum += counter
add r0, r0, #1    @ counter++
cmp r0, #5        @ Compare counter with 5
blt loop          @ Branch if less than 5
mov r2, r1        @ Store final sum in r2`)

  const [assemblyOutput, setAssemblyOutput] = useState('')
  const [isAssembling, setIsAssembling] = useState(false)
  const [assemblerOptions] = useState<AssemblerOptions>({
    baseAddress: 0x10000
  })
  const [emulationOutput, setEmulationOutput] = useState('')
  const [isEmulating, setIsEmulating] = useState(false)
  const [stepOutput, setStepOutput] = useState('')
  const [isStepping, setIsStepping] = useState(false)
  const [emulator, setEmulator] = useState<ARMEmulator | null>(null)
  const [highlighter, setHighlighter] = useState<CodeHighlighter | null>(null)
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined)

     const handleAssemble = useCallback(async () => {
     if (!assemblyCode.trim()) {
       setAssemblyOutput('Error: No assembly code provided')
       return
     }

     setIsAssembling(true)
     setAssemblyOutput('Assembling...')

     try {
       const assembler = new ARMAssembler(assemblerOptions)
       await assembler.initialize()

             const result = await assembler.assemble(assemblyCode)
      const stats = assembler.getStats(result)
      const hexBytes = assembler.bytesToHex(result.mc)

     const output = [
       'Assembly successful!',
       '',
       `Statistics:`,
       `  ${stats}`,
       `  Base Address: 0x${assemblerOptions.baseAddress?.toString(16).padStart(8, '0')}`,
        '',
        `Machine Code (hex):`,
        hexBytes,
        '',
        `Raw bytes:`,
        `[${Array.from(result.mc).join(', ')}]`,
      ].join('\n')

      setAssemblyOutput(output)

             assembler.destroy()
     } catch (error) {
       setAssemblyOutput('ASSEMBLY_ERROR: Assembly Failed')
     } finally {
       setIsAssembling(false)
     }
   }, [assemblyCode, assemblerOptions])


   const handleEmulate = useCallback(async () => {
     if (!assemblyCode.trim()) {
       setEmulationOutput('Error: No assembly code provided')
       return
     }

     setIsEmulating(true)
     setEmulationOutput('Initializing emulator...')

     try {
       // First assemble the code
       const assembler = new ARMAssembler(assemblerOptions)
       await assembler.initialize()
       const assemblyResult = await assembler.assemble(assemblyCode)
       
       setEmulationOutput('Assembly complete. Starting emulation...')

       // Then emulate it
       const emulator = new ARMEmulator()
       await emulator.initialize()
       await emulator.loadCode(assemblyResult.mc)

             // Registers are already initialized to 0 by the emulator

       setEmulationOutput('Running emulation...')

             // Run the emulation with higher instruction limit for loops
      const runResult = await emulator.run(1000) // Allow up to 1000 instructions for complex programs

               // Get the results
        const result = await emulator.getEmulationResult()
        const formattedRegisters = formatRegisters(result.registers || []);
        const formattedMemory = result.memory ? formatMemory(result.memory) : 'No memory data';

        const output = [
          'Emulation completed successfully!',
          '',
          'Final Register State:',
          formattedRegisters,
          '',
          'Memory Contents (first 64 bytes):',
          formattedMemory,
          '',
          `Statistics:`,
          `  Instructions assembled: ${assemblyResult.count}`,
          `  Instructions executed: ${runResult.executedInstructions}`,
          `  Memory mapped: 8KB (4KB code + 4KB stack)`,
        ].join('\n')

       setEmulationOutput(output)

       // Cleanup
       emulator.destroy()
       assembler.destroy()
         } catch (error) {
      setEmulationOutput('EMULATION_ERROR: Emulation Failed')
    } finally {
       setIsEmulating(false)
     }
   }, [assemblyCode, assemblerOptions])

  const handleInitializeDebugger = useCallback(async () => {
    if (!assemblyCode.trim()) {
      setStepOutput('Error: No assembly code provided')
      return
    }

    setIsStepping(true)
    setStepOutput('Initializing debugger...')

    try {
      // First assemble the code
      const assembler = new ARMAssembler(assemblerOptions)
      await assembler.initialize()
      const assemblyResult = await assembler.assemble(assemblyCode)
      
      setStepOutput('Assembly complete. Initializing emulator...')

      // Initialize emulator for debugging
      const newEmulator = new ARMEmulator()
      await newEmulator.initialize()
      await newEmulator.loadCode(assemblyResult.mc)

      // Initialize code highlighter
      setStepOutput('Initializing code highlighter...')
      const newHighlighter = await createHighlighter(assemblyCode, assemblerOptions)
      
      setEmulator(newEmulator)
      setHighlighter(newHighlighter)
      
      // Clear any previous highlighting
      setHighlightedLine(undefined)
      
      setStepOutput('Debugger and highlighter initialized and ready for stepping!\n\nClick "Step" to execute one instruction at a time.')


      // Cleanup assembler
      assembler.destroy()
    } catch (error) {
      setStepOutput('INIT_ERROR: Debugger Initialization Failed')
    } finally {
      setIsStepping(false)
    }
  }, [assemblyCode, assemblerOptions])

  const handleStep = useCallback(async () => {
    if (!emulator) {
      setStepOutput('Error: Debugger not initialized. Please initialize first.')
      return
    }

    if (!highlighter) {
      setStepOutput('Error: Code highlighter not initialized. Please initialize first.')
      return
    }

    setIsStepping(true)
    setStepOutput('Stepping...')

    try {
      const stepResult = await emulator.stepDebug()
      const formattedResult = formatStepResult(stepResult)
      
      // Get highlight information from step result
      const newHighlightInfo = getHighlightFromStepResult(stepResult, highlighter)
      
      if (newHighlightInfo) {
        setHighlightedLine(newHighlightInfo.lineNumber)
        const highlightOutput = `\nHighlighting Line ${newHighlightInfo.lineNumber}`
        setStepOutput(`${formattedResult}${highlightOutput}`)
      } else {
        setHighlightedLine(undefined)
        setStepOutput(formattedResult)
      }
    } catch (error) {
      setStepOutput('RUNTIME_ERROR: Step Execution Failed')
      setHighlightedLine(undefined)
    } finally {
      setIsStepping(false)
    }
  }, [emulator, highlighter])

  const handleResetDebugger = useCallback(async () => {
    if (!emulator) {
      setStepOutput('Error: Debugger not initialized.')
      return
    }

    setIsStepping(true)
    setStepOutput('Resetting...')

    try {
      await emulator.reset()
      
      setHighlightedLine(undefined)
      
      setStepOutput('Debugger reset successfully!\n\nPC reset to start of code. Ready for stepping.')
    } catch (error) {
      setStepOutput('RESET_ERROR: Reset Failed')
    } finally {
      setIsStepping(false)
    }
  }, [emulator])

  const handleCleanupDebugger = useCallback(() => {
    if (emulator) {
      emulator.destroy()
      setEmulator(null)
    }
    
    if (highlighter) {
      highlighter.reset()
      setHighlighter(null)
    }
    
    setHighlightedLine(undefined)
    setStepOutput('Debugger and highlighter cleaned up.')
  }, [emulator, highlighter])

  const loadExampleAssembly = (example: string) => {
    const examples = {
      basic: `mov r0, #42
add r1, r0, #10
sub r2, r1, r0`,
      
      memory: `ldr r1, =0x30000   @ Set r1 to data memory address
ldr r0, [r1]       @ Load from data memory
ldr r3, =0x30010   @ Set r3 to data memory + 16
str r0, [r3]       @ Store to data memory + 16
add r2, r0, #1     @ Add 1 to loaded value`,
      
      branches: `mov r0, #5       @ Set r0 to 5
cmp r0, #0        @ Compare with 0
beq skip          @ Branch if equal (won't branch)
mov r1, #1        @ Set r1 to 1
skip:
mov r2, #2        @ Set r2 to 2`,
      
      loop: `mov r0, #0        @ Initialize counter
mov r1, #0        @ Initialize sum
loop:
add r1, r1, r0    @ sum += counter
add r0, r0, #1    @ counter++
cmp r0, #5        @ Compare counter with 5
blt loop          @ Branch if less than 5
mov r2, r1        @ Store final sum in r2`,
      
      simple: `mov r0, #5
add r1, r0, #3
sub r2, r1, #1`
    }
    setAssemblyCode(examples[example as keyof typeof examples] || examples.basic)
  }

  return (
    <div className="h-screen w-full p-4">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/preview"
          className="flex items-center gap-2 bg-background hover:bg-accent hover:text-accent-foreground px-3 py-2 rounded-md border border-border transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>
      
      <div className="mb-4 pt-12">
      </div>
      
      <div className="h-[calc(100vh-8rem)] w-full border-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left panel - Assembly */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Assembly</h3>
                </div>
                <div className="flex gap-1 mb-3">
                  <button 
                    onClick={() => loadExampleAssembly('basic')}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md transition-colors"
                  >
                    Basic
                  </button>
                  <button 
                    onClick={() => loadExampleAssembly('memory')}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md transition-colors"
                  >
                    Memory
                  </button>
                  <button 
                    onClick={() => loadExampleAssembly('branches')}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md transition-colors"
                  >
                    Branches
                  </button>
                  <button 
                    onClick={() => loadExampleAssembly('loop')}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md transition-colors"
                  >
                    Loop
                  </button>
                  <button 
                    onClick={() => loadExampleAssembly('simple')}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md transition-colors"
                  >
                    Simple
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleAssemble}
                    disabled={isAssembling}
                    className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {isAssembling ? 'Assembling...' : 'Assemble'}
                  </button>
                  <button 
                    onClick={handleEmulate}
                    disabled={isEmulating || isAssembling}
                    className="flex-1 bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {isEmulating ? 'Emulating...' : 'Emulate'}
                  </button>
                </div>
              </div>
              <div className="flex-1 p-2 min-h-0">
                <CodeEditor
                  value={assemblyCode}
                  onChange={(value) => setAssemblyCode(value || '')}
                  height="100%"
                  className="border border-border rounded-md"
                  highlightedLine={highlightedLine}
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right side with three vertical panels */}
          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Emulation Panel */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col bg-card border border-border rounded-lg">
                  <div className="p-4 border-b border-border flex-shrink-0">
                    <h3 className="text-lg font-semibold">Emulation</h3>
                  </div>
                  <div className="flex-1 p-2 min-h-0">
                    <pre className="h-full w-full bg-background border border-border rounded-md p-3 text-xs font-mono overflow-auto whitespace-pre-wrap">
                      {emulationOutput || 'Click "Emulate" to run assembly code in ARM CPU emulator...'}
                    </pre>
                  </div>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Step Debugging Panel */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col bg-card border border-border rounded-lg">
                  <div className="p-4 border-b border-border flex-shrink-0">
                    <h3 className="text-lg font-semibold">Debugger</h3>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={handleInitializeDebugger}
                        disabled={isStepping || !!emulator}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        {isStepping ? 'Initializing...' : (emulator ? 'Ready' : 'Initialize')}
                      </button>
                      <button 
                        onClick={handleStep}
                        disabled={isStepping || !emulator}
                        className="flex-1 bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        {isStepping ? 'Stepping...' : 'Step'}
                      </button>
                      <button 
                        onClick={handleResetDebugger}
                        disabled={isStepping || !emulator}
                        className="flex-1 bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={handleCleanupDebugger}
                        disabled={isStepping || !emulator}
                        className="flex-1 bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-destructive-foreground px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        Clean
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-2 min-h-0">
                    <pre className="h-full w-full bg-background border border-border rounded-md p-3 text-xs font-mono overflow-auto whitespace-pre-wrap">
                      {stepOutput || 'Click "Initialize" to prepare the debugger for single-step execution...'}
                    </pre>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
} 