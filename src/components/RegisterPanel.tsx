import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

const registers = [
  'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7',
  'R8', 'R9', 'R10', 'R11', 'R12', 'SP', 'LR', 'PC'
]

const formatRegisterName = (register: string) => {
  // Add space for single digit registers like R0 -> R 0
  if (register.length === 2 && register.startsWith('R')) {
    return `R ${register[1]}`
  }
  // Add space for SP, LR, PC
  if (register === 'SP' || register === 'LR' || register === 'PC') {
    return `${register[0]} ${register[1]}`
  }
  return register
}

export default function RegisterPanel() {
  return (
    <div className="w-full">
      <Table className="border-none">
        <TableBody>
          {registers.map((register, index) => (
            <TableRow key={register} className={`h-12 border-none ${index % 2 === 0 ? 'bg-white hover:bg-white' : 'bg-[#f7f7f8] hover:bg-[#f7f7f8]'}`}>
              <TableCell className="h-12 w-1/4 text-center border-none">
                <Badge 
                  variant="outline" 
                  className="font-mono text-xs"
                  style={{ color: '#5a5a5a' }}
                >
                  {formatRegisterName(register)}
                </Badge>
              </TableCell>
              <TableCell className="font-mono h-12 w-1/2 text-center border-none" style={{ color: '#5a5a5a' }}>
                00000000
              </TableCell>
              <TableCell className="font-mono h-12 w-1/4 text-center border-none" style={{ color: '#5a5a5a' }}>
                0
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}