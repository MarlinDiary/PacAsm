import TabBar from './TabBar'

interface CardProps {
  children?: React.ReactNode
}

export default function Card({ children }: CardProps) {
  return (
    <div className="w-full h-full bg-white rounded-lg flex flex-col overflow-hidden">
      <TabBar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}