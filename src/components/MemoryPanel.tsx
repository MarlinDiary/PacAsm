import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

interface MemoryRow {
  address: string;
  hex: string;
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
      const address = region.start + (i * 16)
      const addressHex = `0x${address.toString(16).toUpperCase().padStart(8, '0')}`
      const hexBytes = '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00'
      
      rows.push({
        address: addressHex,
        hex: hexBytes
      })
    }
  })
  
  return rows
}

const memoryRows = generateMemoryRows()

export default function MemoryPanel() {
  return (
    <div className="w-full">
      <Table className="border-none">
        <TableBody>
          {memoryRows.map((row, index) => (
            <TableRow key={row.address} className={`h-12 border-none ${index % 2 === 0 ? 'bg-white hover:bg-white' : 'bg-[#f7f7f8] hover:bg-[#f7f7f8]'}`}>
              <TableCell className="h-12 w-1/4 text-center border-none font-mono text-xs" style={{ color: '#5a5a5a' }}>
                {row.address}
              </TableCell>
              <TableCell className="font-mono h-12 w-3/4 text-center border-none text-xs" style={{ color: '#5a5a5a' }}>
                {row.hex}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}