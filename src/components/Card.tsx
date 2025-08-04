import TabBar, { Tab } from './TabBar'
import { Gamepad2 } from 'lucide-react'

interface CardProps {
  children?: React.ReactNode
  showGameTab?: boolean
}

export default function Card({ children, showGameTab = false }: CardProps) {
  return (
    <div className="w-full h-full bg-white rounded-lg flex flex-col overflow-hidden">
      <TabBar>
        {showGameTab && (
          <Tab 
            icon={Gamepad2}
            text="Game"
            color="#3579f6"
            isSelected={true}
          />
        )}
      </TabBar>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}