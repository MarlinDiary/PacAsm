import { Hammer } from '../ui/hammer'

export default function StatusBar() {
  return (
    <div className="flex items-center h-8">
      {/* Status display */}
      <div className="h-8 px-3 bg-[#e7e7e7] rounded-sm flex items-center justify-center gap-2 w-[129px]">
        <Hammer size={16} className="text-[#e6a447]" />
        <span className="text-sm font-medium" style={{ color: '#e6a447' }}>
          Pending...
        </span>
      </div>
    </div>
  )
}