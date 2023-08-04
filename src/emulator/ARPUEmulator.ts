import { RAM_SIZE_IN_BYTES, STACK_SIZE_IN_BYTES, WORD_SIZE } from '../const/emulator-constants.ts';
import { AsmLine } from '../asm/AsmLine.ts';
import { compileIntermediateRepresentation, IRToMachineCode } from '../asm/assemble.ts';
import { Operand } from '../asm/Operand.ts';
import { isBitSet } from '../util/common-util.ts';

export interface ARPUEmulatorState {
  // Intermediate representation with filled in offsets and immediates
  asmLines: AsmLine[];
  // Current position in intermediate representation
  lineIndex : number;
  // R1 - R4
  registers: number[];
  // Program counter
  PC: number;
  // Zero flag
  ZF: boolean;
  // Carry out flag
  COUTF: boolean;
  // Most significant bit flag
  MSBF: boolean;
  // Least significant bit flag
  LSBF: boolean;
  // Program memory
  PMEM: number[];
  // Random access memory
  RAM: number[];
  stack: number[];
  inputPorts: number[];
  outputPorts: number[];
  isWaitingPortInput: boolean;
  cycle: number;
}

export function defaultARPUEmulatorState(asmCode: string) {
  const asmLines = compileIntermediateRepresentation(asmCode.split('\n'));
  return {
    asmLines,
    lineIndex: 0,
    registers: [0, 0, 0, 0],
    PC: 0,
    ZF: false,
    COUTF: false,
    MSBF: false,
    LSBF: false,
    PMEM: IRToMachineCode(asmLines),
    RAM: new Array(RAM_SIZE_IN_BYTES).fill(0),
    stack: [],
    inputPorts: [0, 0, 0, 0],
    outputPorts: [0, 0, 0, 0],
    isWaitingPortInput: false,
    cycle: 0,
  };
}

export class ARPUEmulator {
  private readonly state: ARPUEmulatorState;
  private readonly handlers: { [key: string]: (operands: Operand[]) => void } = {
    INC: this.increment.bind(this),
    IMM: this.loadImmediate.bind(this),
    PLD: this.portLoad.bind(this),
    PST: this.portStore.bind(this),
    BRA: this.branch.bind(this),
    SOP: this.stackOperation.bind(this),
  };

  constructor(asmCode: string) {
    this.state = defaultARPUEmulatorState(asmCode);
  }

  public step() {
    if (this.state.isWaitingPortInput) {
      throw new Error('Cannot make a step while waiting for the port input');
    }

    const instruction = this.state.asmLines[this.state.lineIndex];
    const mnemonic = instruction.getMnemonic();
    this.handlers[mnemonic](instruction.getOperands());
  }

  private increment(operands: Operand[]) {
    const operand1Value = operands[0].toInt();
    this.state.registers[operand1Value]++;
    if (this.state.registers[operand1Value] >= WORD_SIZE) {
      this.state.registers[operand1Value] = 0;
    }
    this.state.PC += 1;
    this.state.lineIndex += 1;
    this.state.cycle += 1;
  }

  private loadImmediate(operands: Operand[]) {
    const destinationRegisterIndex = operands[0].toInt();
    const immediate = operands[2].toInt();
    this.state.registers[destinationRegisterIndex] = immediate;
    this.state.PC += 2;
    this.state.lineIndex += 1;
    this.state.cycle += 1;
  }

  public portInput(value: number) {
    if (!this.state.isWaitingPortInput) {
      throw new Error('Cannot input to port while not waiting for port input');
    }

    const asmLine = this.state.asmLines[this.state.lineIndex];
    if (asmLine.getMnemonic() !== 'PLD') {
      throw new Error('Illegal state: current instruction is not PLD but we are waiting for port input');
    }

    const destinationRegisterIndex = asmLine.getOperands()[0].toInt();
    const portIndex = asmLine.getOperands()[1].toInt();
    this.state.registers[destinationRegisterIndex] = value;
    this.state.inputPorts[portIndex] = value;
    this.state.PC += 1;
    this.state.lineIndex += 1;
    this.state.isWaitingPortInput = false;
    this.state.cycle += 1;
  }

  private portLoad() {
    this.state.isWaitingPortInput = true;
  }

  private portStore(operands: Operand[]) {
    const sourceRegisterIndex = operands[0].toInt();
    const portIndex = operands[1].toInt();
    this.state.outputPorts[portIndex] = this.state.registers[sourceRegisterIndex];
    this.state.PC += 1;
    this.state.lineIndex += 1;
    this.state.cycle += 1;
  }

  private branch(operands: Operand[]) {
    const destinationOffset = operands[2].toInt();

    if (this.shouldJump(operands)) {
      const jumpToIndex = this.state.asmLines.findIndex(
        (asmLine) => asmLine.getOffsetInBytes() === destinationOffset
      );
      this.state.PC = destinationOffset;
      this.state.lineIndex = jumpToIndex;
    } else {
      this.state.PC += 2;
      this.state.lineIndex += 1;
    }

    this.state.cycle += 1;
  }

  private shouldJump(operands: Operand[]) {
    const condition = operands[0].toInt();
    const flags = operands[1].toInt();
    const isConditional = isBitSet(flags, 0);
    const isNegate = isBitSet(flags, 1);

    if (!isConditional) {
      return true;
    }

    const flag = this.getFlags()[condition];

    return flag !== isNegate;
  }

  private stackOperation(operands: Operand[]) {
    const isPush = operands[1].toInt() === 0;

    if (isPush) {
      const sourceRegisterIndex = operands[0].toInt();
      const valueToPush = this.state.registers[sourceRegisterIndex];
      this.state.stack.push(valueToPush);
    } else {
      const destinationRegisterIndex = operands[0].toInt();
      const poppedValue = this.state.stack.pop();
      const valueToWrite = poppedValue === undefined ? 0 : poppedValue;
      this.state.registers[destinationRegisterIndex] = valueToWrite;
    }

    this.state.PC += 1;
    this.state.lineIndex += 1;
    this.state.cycle += 1;
  }

  public getProgramMemory() {
    return this.state.PMEM;
  }

  public getRegisters() {
    return this.state.registers;
  }

  public getFlags() {
    return [this.state.ZF, this.state.COUTF, this.state.MSBF, this.state.LSBF];
  }

  public getState() {
    return this.state;
  }
}