'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'

export default function PreviewPage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            PacAsm Preview
          </h1>
          <p className="text-muted-foreground">
            Choose your development environment
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/preview/emulator"
            className="flex items-center justify-between w-full p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <div className="space-y-1">
              <div className="font-medium">ARM Emulator</div>
              <div className="text-sm text-muted-foreground">
                Assembly, disassembly, and CPU emulation
              </div>
            </div>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Development Mode Only
          </p>
        </div>
      </div>
    </div>
  )
}