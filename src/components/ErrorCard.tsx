'use client'

import { useRef, useEffect, useState } from 'react'

interface ErrorCardProps {
  error: string
  code: string
  timestamp: Date
  diagnosis: string
  isLoading: boolean
}

export default function ErrorCard({ error, diagnosis, isLoading }: ErrorCardProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [enableTransition, setEnableTransition] = useState(false)
  const prevLoadingRef = useRef(isLoading)

  useEffect(() => {
    // Only enable transition when loading state changes
    if (prevLoadingRef.current !== isLoading) {
      setEnableTransition(true)
      prevLoadingRef.current = isLoading
      
      // Disable transition after animation completes
      const timer = setTimeout(() => {
        setEnableTransition(false)
      }, 400)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (contentRef.current) {
          setHeight(contentRef.current.scrollHeight)
        }
      })
      resizeObserver.observe(contentRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  return (
    <div 
      className="rounded-lg overflow-hidden bg-[#fdf1f0] dark:bg-[#372B2B]"
      style={{ 
        transition: enableTransition ? 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        height: height
      }}
    >
      <div ref={contentRef} className="p-4">
        <div className={isLoading ? '' : 'mb-2'}>
          <p 
            className={`text-sm font-semibold text-[#dd544b] dark:text-[#F8615C] ${isLoading && !diagnosis ? 'animate-pulse' : ''}`} 
          >
            {error}
          </p>
        </div>

        {!isLoading && (
          <div>
            <p className="text-sm text-[#e34940] dark:text-[#F8615C]">
              {diagnosis}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}