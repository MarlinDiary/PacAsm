'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'

export default function PreviewPage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PacAsm Preview
          </h1>
          <p className="text-xl text-gray-600">
            Choose your development environment
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/preview/emulator"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            ARM Emulator
          </Link>
          
          <Link
            href="/preview/game"
            className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            Game
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Development Mode Only
          </p>
        </div>
      </div>
    </div>
  )
}