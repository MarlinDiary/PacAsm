'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'

export default function GamePage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <div className="h-screen w-full p-4">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/preview"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg border border-gray-200 shadow-sm transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>
      
      {/* Empty page content */}
    </div>
  )
}