import { Search, ListFilter } from 'lucide-react'
import { useState, useRef } from 'react'

interface QueryBarProps {
  children?: React.ReactNode
  onSearch?: (query: string) => void
  onFilterToggle?: (isActive: boolean) => void
}

export default function QueryBar({ children, onSearch, onFilterToggle }: QueryBarProps) {
  const [isFilterActive, setIsFilterActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleFilterToggle = () => {
    const newState = !isFilterActive
    setIsFilterActive(newState)
    onFilterToggle?.(newState)
  }

  return (
    <div 
      className="w-full"
      style={{ 
        height: '32px',
        borderBottom: '1px solid #f0f0f0'
      }}
    >
      <div 
        className="w-full h-full flex items-center"
        style={{
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingTop: '4px',
          paddingBottom: '4px'
        }}
      >
        <Search 
          size={16} 
          color="#a8a8a8"
          onClick={() => inputRef.current?.focus()}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          autoComplete="off"
          value={searchQuery}
          onChange={handleInputChange}
          className="w-full outline-none border-none bg-transparent focus:bg-transparent placeholder:text-[#c4c4c6] placeholder:font-medium ml-1 text-sm text-[#5c5c5c]"
          style={{
            lineHeight: '1rem'
          }}
        />
        <ListFilter
          size={16}
          color={isFilterActive ? "#737373" : "#a8a8a8"}
          className="cursor-pointer ml-1"
          onClick={handleFilterToggle}
        />
      </div>
      {children}
    </div>
  )
}