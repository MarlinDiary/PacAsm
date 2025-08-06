import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

interface MemoryRow {
  address: string;
  hex: string;
  ascii: string;
}

const generateMemoryRows = (): MemoryRow[] => {
  const rows: MemoryRow[] = []
  const memoryRegions = [
    { start: 0x10000, name: 'Code' },
    { start: 0x20000, name: 'Stack' },
    { start: 0x30000, name: 'Data' }
  ]
  memoryRegions.forEach(region => {
    for (let i = 0; i < 256; i++) {
      const address = region.start + (i * 4)
      const addressHex = `0x${address.toString(16).toUpperCase().padStart(8, '0')}`
      const hexBytes = '00 00 00 00'
      const asciiBytes = '....'
      
      rows.push({
        address: addressHex,
        hex: hexBytes,
        ascii: asciiBytes
      })
    }
  })
  
  return rows
}

const memoryRows = generateMemoryRows()

interface MemoryPanelProps {
  searchQuery?: string
  hideZeroRows?: boolean
}

export default function MemoryPanel({ searchQuery = '', hideZeroRows = false }: MemoryPanelProps) {
  const filteredRows = memoryRows.filter(row => {
    // Search filter
    const matchesSearch = !searchQuery || 
      row.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.hex.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.ascii.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Zero rows filter - check if all hex bytes are '00'
    const isAllZeros = hideZeroRows && row.hex === '00 00 00 00'
    
    return matchesSearch && !isAllZeros
  })
  
  if (filteredRows.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img 
          src="/res/null.png" 
          alt="No results" 
          style={{ width: '200px', flexShrink: 0, pointerEvents: 'none', userSelect: 'none' }}
        />
      </div>
    )
  }
  
  return (
    <div className="w-full">
      <Table className="border-none">
        <TableBody>
          {filteredRows.map((row, index) => (
            <TableRow key={row.address} className={`h-12 border-none ${index % 2 === 0 ? 'bg-white hover:bg-white' : 'bg-[#f7f7f8] hover:bg-[#f7f7f8]'}`}>
              <TableCell className="h-12 w-1/3 text-left border-none font-mono text-xs pl-5" style={{ color: '#5a5a5a' }}>
                {row.address}
              </TableCell>
              <TableCell className="font-mono h-12 w-1/3 text-center border-none text-xs" style={{ color: '#5a5a5a' }}>
                {row.hex}
              </TableCell>
              <TableCell className="font-mono h-12 w-1/3 text-right border-none text-xs pr-5" style={{ color: '#5a5a5a' }}>
                {row.ascii}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}