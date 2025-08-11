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
        <span className="text-[#737373] dark:text-[#A8A8A8] text-sm font-mono">CMD_PORT: 0x00030000</span>
        {isCopied ? (
          <Check 
            size={14} 
            className="text-[#737373] dark:text-[#A8A8A8]"
          />
        ) : (
          <Copy 
            size={14} 
            className="cursor-pointer transition-colors text-[#a8a8a8] dark:text-[#7D7D7D] hover:text-[#737373] dark:hover:text-[#A8A8A8]"
            onClick={handleCopy}
          />
        )}
      </div>
      {children}
    </SubBar>
  )
}