import { useState } from 'react'
import TabBar, { Tab } from './bar/TabBar'
import { LucideIcon } from 'lucide-react'

interface TabConfig {
  icon: LucideIcon
  text: string
  color: string
}

interface CardProps {
  children?: React.ReactNode
  tabs?: TabConfig[]
  defaultSelectedTab?: number
  tabContent?: React.ReactNode[]
}

export default function Card({ children, tabs = [], defaultSelectedTab = 0, tabContent = [] }: CardProps) {
  const [selectedTab, setSelectedTab] = useState(defaultSelectedTab)

  return (
    <div className="w-full h-full bg-white rounded-lg flex flex-col overflow-hidden">
      <TabBar>
        {tabs.map((tab, index) => (
          <Tab 
            key={index}
            icon={tab.icon}
            text={tab.text}
            color={tab.color}
            isSelected={selectedTab === index}
            onClick={() => setSelectedTab(index)}
          />
        ))}
      </TabBar>
      <div 
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' }
        } as React.CSSProperties & { WebkitScrollbar: { display: string } }}
      >
        {tabContent.length > 0 ? tabContent[selectedTab] : children}
      </div>
    </div>
  )
}