'use client'

import { format } from 'timeago.js'

interface ErrorCardProps {
  error: string
  code: string
  timestamp: Date
  diagnosis: string
  isLoading: boolean
}

export default function ErrorCard({ error, code, timestamp, diagnosis, isLoading }: ErrorCardProps) {

  return (
    <div 
      className="rounded-lg p-4 mb-3"
      style={{ backgroundColor: '#f7f7f8' }}
    >
      <div className="flex justify-between items-start mb-3">
        <div 
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: '#fcf1f0', color: '#ba3a37' }}
        >
          Error
        </div>
        <span className="text-xs" style={{ color: '#949494' }}>
          {format(timestamp)}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm font-mono" style={{ color: '#ba3a37' }}>
          {error}
        </p>
      </div>

      <div className="border-t pt-3" style={{ borderColor: '#e8e8e8' }}>
        <p className="text-sm" style={{ color: '#5a5a5a' }}>
          {isLoading ? (
            <span className="animate-pulse">Analyzing error...</span>
          ) : (
            diagnosis
          )}
        </p>
      </div>
    </div>
  )
}