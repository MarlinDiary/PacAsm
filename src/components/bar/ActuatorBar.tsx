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
        <span className="text-[#8A8A8E] dark:text-[#9FA0A2] text-sm font-mono">CMD_PORT: 0x00030000</span>
        {isCopied ? (
          <Check 
            size={14} 
            className="text-[#8A8A8E] dark:text-[#9FA0A2]"
          />
        ) : (
          <Copy 
            size={14} 
            className="cursor-pointer transition-colors text-[#8A8A8E] dark:text-[#9FA0A2] hover:text-[#262626] dark:hover:text-[#FFFFFF]"
            onClick={handleCopy}
          />
        )}
      </div>
      {children}
    </SubBar>
  )
}