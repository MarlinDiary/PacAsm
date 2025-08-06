import { Search } from 'lucide-react'

interface QueryBarProps {
  children?: React.ReactNode
}

export default function QueryBar({ children }: QueryBarProps) {
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
          paddingRight: '12px',
          paddingTop: '4px',
          paddingBottom: '4px'
        }}
      >
        <Search 
          size={16} 
          color="#8c8c8c"
        />
        <input
          type="text"
          placeholder="Search..."
          autoComplete="off"
          className="w-full outline-none border-none bg-transparent focus:bg-transparent placeholder:text-[#c4c4c6] placeholder:font-medium ml-1 text-sm text-[#5c5c5c]"
          style={{
            lineHeight: '1rem'
          }}
        />
      </div>
      {children}
    </div>
  )
}