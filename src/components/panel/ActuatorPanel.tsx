import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

const actuatorData = [
  { direction: 'Up', value: '1', symbol: '↑' },
  { direction: 'Down', value: '2', symbol: '↓' },
  { direction: 'Left', value: '3', symbol: '←' },
  { direction: 'Right', value: '4', symbol: '→' }
]

export default function ActuatorPanel() {
  return (
    <div className="w-full">
      <Table className="border-none">
        <TableBody>
          {actuatorData.map((item) => (
            <TableRow key={item.direction} className="h-12" style={{ borderBottom: '0.5px solid #ebebeb' }}>
              <TableCell className="h-12 w-1/3 text-center border-none" style={{ color: '#5a5a5a' }}>
                <span className="text-lg">{item.symbol}</span>
              </TableCell>
              <TableCell className="h-12 w-1/3 text-center border-none" style={{ color: '#5a5a5a' }}>
                {item.direction}
              </TableCell>
              <TableCell className="font-mono h-12 w-1/3 text-center border-none" style={{ color: '#5a5a5a' }}>
                {item.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}