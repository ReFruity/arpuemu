// Calculates Nth fibonacci number

IMM R1 0 0
IMM R2 0 1
IMM R3 0 3 // N

.loop
ADD R1 R2
MOV R4 R1
MOV R1 R2
MOV R2 R4
DEC R3 R3
BRA 0 0b11 .loop

PST R1 0

.end
BRA 0 0 .end