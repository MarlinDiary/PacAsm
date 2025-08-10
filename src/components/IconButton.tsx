import { LucideIcon } from 'lucide-react'

interface IconButtonProps {
  icon: LucideIcon
  onClick?: () => void
  size?: number
}

export default function IconButton({ icon: Icon, onClick, size = 16 }: IconButtonProps) {
  return (
    <button 
      className="w-8 h-8 flex items-center justify-center hover:bg-[#e7e7e7] hover:rounded-md group"
      onClick={onClick}
    >
      <Icon 
        size={size} 
        className="text-[#737373] group-hover:text-[#1a1a1a]"
      />
    </button>
  )
}