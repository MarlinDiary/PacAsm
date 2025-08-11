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

interface RegisterData {
  register: string
  value: number
}

interface RegisterPanelProps {
  registers?: RegisterData[]
  previousRegisters?: RegisterData[]
}

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

export default function RegisterPanel({ registers: registerData, previousRegisters }: RegisterPanelProps) {
  const getRegisterValue = (registerName: string): number => {
    if (!registerData) return 0
    // Convert to lowercase to match the data from emulator (r0, r1, etc.)
    const normalizedName = registerName.toLowerCase()
    const found = registerData.find(reg => reg.register === normalizedName)
    return found ? found.value : 0
  }

  const getPreviousRegisterValue = (registerName: string): number => {
    if (!previousRegisters) return 0
    const normalizedName = registerName.toLowerCase()
    const found = previousRegisters.find(reg => reg.register === normalizedName)
    return found ? found.value : 0
  }

  const isRegisterChanged = (registerName: string): boolean => {
    if (!previousRegisters) return false
    const currentValue = getRegisterValue(registerName)
    const previousValue = getPreviousRegisterValue(registerName)
    return currentValue !== previousValue
  }

  return (
    <div className="w-full">
      <Table className="border-none">
        <TableBody>
          {registers.map((register, index) => {
            const value = getRegisterValue(register)
            const hexValue = value.toString(16).toUpperCase().padStart(8, '0')
            const hasChanged = isRegisterChanged(register)
            
            return (
              <TableRow key={register} className={`h-12 border-none ${index % 2 === 0 ? 'bg-white hover:bg-white dark:bg-[#262626] dark:hover:bg-[#262626]' : 'bg-[#f7f7f8] hover:bg-[#f7f7f8] dark:bg-[#353535] dark:hover:bg-[#353535]'}`}>
                <TableCell className="h-12 w-1/4 text-center border-none">
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs ${hasChanged ? 'text-white bg-[#1a1a1a] dark:bg-[#F5F5F5] dark:text-black border-none' : 'text-[#5a5a5a] dark:text-[#BDBEC2] bg-transparent'}`}
                  >
                    {formatRegisterName(register)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono h-12 w-1/2 text-center border-none text-[#5a5a5a] dark:text-[#BDBEC2]">
                  {hexValue}
                </TableCell>
                <TableCell className="font-mono h-12 w-1/4 text-center border-none text-[#5a5a5a] dark:text-[#BDBEC2]">
                  {value}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}