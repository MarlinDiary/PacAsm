interface TabBarProps {
  children?: React.ReactNode
}

export default function TabBar({ children }: TabBarProps) {
  return (
    <div 
      className="w-full flex items-center px-3 rounded-t-lg"
      style={{ 
        height: '36px', 
        backgroundColor: '#fafafa' 
      }}
    >
      {children}
    </div>
  )
}