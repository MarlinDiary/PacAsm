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
            <TableRow key={item.direction} className="h-12 hover:bg-transparent border-b border-[#ebebeb] dark:border-[#3C3C3C]">
              <TableCell className="h-12 w-1/3 text-center border-none text-[#5a5a5a] dark:text-[#BDBEC2]">
                <span className="text-lg">{item.symbol}</span>
              </TableCell>
              <TableCell className="h-12 w-1/3 text-center border-none text-[#5a5a5a] dark:text-[#BDBEC2]">
                {item.direction}
              </TableCell>
              <TableCell className="font-mono h-12 w-1/3 text-center border-none text-[#5a5a5a] dark:text-[#BDBEC2]">
                {item.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}