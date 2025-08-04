import TabBar, { Tab } from './TabBar'
import { Gamepad2, Move, CodeXml } from 'lucide-react'

interface CardProps {
  children?: React.ReactNode
  tabType?: 'game' | 'actuator' | 'code'
}

export default function Card({ children, tabType }: CardProps) {
  return (
    <div className="w-full h-full bg-white rounded-lg flex flex-col overflow-hidden">
      <TabBar>
        {tabType === 'game' && (
          <Tab 
            icon={Gamepad2}
            text="Game"
            color="#3579f6"
            isSelected={true}
          />
        )}
        {tabType === 'actuator' && (
          <Tab 
            icon={Move}
            text="Actuator"
            color="#f4ba40"
            isSelected={true}
          />
        )}
        {tabType === 'code' && (
          <Tab 
            icon={CodeXml}
            text="Code"
            color="#4fae40"
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