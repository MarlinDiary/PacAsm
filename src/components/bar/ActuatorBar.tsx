import { useState } from 'react'
import SubBar from './SubBar'
import { Copy, Check } from 'lucide-react'

interface ActuatorBarProps {
  children?: React.ReactNode
}

export default function ActuatorBar({ children }: ActuatorBarProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('0x00030000')
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <SubBar>
      <div className="flex items-center justify-center gap-1 w-full">
        <span style={{ color: '#737373', fontSize: '14px', fontFamily: 'monospace' }}>CMD_PORT: 0x00030000</span>
        {isCopied ? (
          <Check 
            size={14} 
            style={{ color: '#737373' }}
          />
        ) : (
          <Copy 
            size={14} 
            className="cursor-pointer transition-colors"
            style={{ color: '#a8a8a8' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#737373'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#a8a8a8'}
            onClick={handleCopy}
          />
        )}
      </div>
      {children}
    </SubBar>
  )
}