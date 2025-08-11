import { Search, ListFilter } from 'lucide-react'
import { useState, useRef } from 'react'

interface QueryBarProps {
  children?: React.ReactNode
  onSearch?: (query: string) => void
  onFilterToggle?: (isActive: boolean) => void
  isFilterActive?: boolean
}

export default function QueryBar({ children, onSearch, onFilterToggle, isFilterActive = false }: QueryBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleFilterToggle = () => {
    const newState = !isFilterActive
    onFilterToggle?.(newState)
  }

  return (
    <div 
      className="w-full h-8 border-b border-[#f0f0f0] dark:border-[#3C3C3C]"
    >
      <div 
        className="w-full h-full flex items-center px-5 py-1"
      >
        <Search 
          size={16} 
          className="text-[#a8a8a8] dark:text-[#8A8A8A]"
          onClick={() => inputRef.current?.focus()}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          autoComplete="off"
          value={searchQuery}
          onChange={handleInputChange}
          className="w-full outline-none border-none bg-transparent focus:bg-transparent placeholder:text-[#c4c4c6] dark:placeholder:text-[#626265] placeholder:font-medium ml-1 text-sm text-[#5c5c5c] dark:text-[#BDBEC2]"
          style={{
            lineHeight: '1rem'
          }}
        />
        <ListFilter
          size={16}
          className={`cursor-pointer ml-1 ${isFilterActive ? 'text-[#737373] dark:text-[#A8A8A8]' : 'text-[#a8a8a8] dark:text-[#7D7D7D]'}`}
          onClick={handleFilterToggle}
        />
      </div>
      {children}
    </div>
  )
}