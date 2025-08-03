'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import MapRenderer from '@/components/MapRenderer'
import { getMap } from '@/data/maps'

export default function GamePage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  const initialMap = getMap('initial')

  if (!initialMap) {
    return <div>Map not found</div>
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
      
      {/* Game content */}
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{initialMap.name}</h1>
          <MapRenderer map={initialMap} />
        </div>
      </div>
    </div>
  )
}