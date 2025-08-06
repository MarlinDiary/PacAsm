interface SubBarProps {
  children?: React.ReactNode
}

export default function SubBar({ children }: SubBarProps) {
  return (
    <div 
      className="w-full flex items-center"
      style={{ 
        height: '32px',
        borderBottom: '1px solid #f0f0f0'
      }}
    >
      {children}
    </div>
  )
}