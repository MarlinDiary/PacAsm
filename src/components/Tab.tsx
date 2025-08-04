import { LucideIcon } from "lucide-react"

interface TabProps {
  icon: LucideIcon
  text: string
  isSelected?: boolean
  color?: string
  onClick?: () => void
}

export default function Tab({ icon: Icon, text, isSelected = false, color = "#666", onClick }: TabProps) {
  return (
    <div 
      className={`h-7 px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-[#f0f0f0] rounded-md ${isSelected ? 'font-medium' : 'font-normal'}`}
      onClick={onClick}
    >
      <div className="w-4 h-4 flex items-center justify-center">
        <Icon 
          size={16} 
          color={color}
        />
      </div>
      <span className="text-sm text-black">
        {text}
      </span>
    </div>
  )
}