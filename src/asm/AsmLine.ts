import { Operand } from './Operand';
import { isData } from './asm-util.ts';
import { INSTRUCTION_MNEMONICS } from './mnemonics.ts';

export class AsmLine {
  private readonly isData: boolean;
  private readonly mnemonic: string;
  private readonly operands: Operand[];
  private readonly sizeInBytes: number;
  private readonly opcode: number;
  private readonly aliasMnemonic?: string;
  private readonly aliasOperands?: Operand[];
  private offsetInBytes?: number;
  private label?: string;

  constructor(mnemonic: string, operands: Operand[], aliasMnemonic?: string, aliasOperands?: Operand[]) {
    this.isData = isData(mnemonic);
    this.mnemonic = mnemonic;
    this.operands = operands;
    this.aliasMnemonic = aliasMnemonic;
    this.aliasOperands = aliasOperands;
    this.sizeInBytes = operands.length === 3 ? 2 : 1;
    this.opcode = INSTRUCTION_MNEMONICS.findIndex((mnemonic) => this.mnemonic === mnemonic);
  }
  getBytes() {
    const operandInts = this.operands.map((operand) => operand.toInt());
    if (operandInts.some((integer) => integer === undefined)) {
      throw new Error(`Some operands that are labels were not filled with immediate values for line "${this.toString()}"`);
    }
    const operandInt1 = operandInts[0];
    const operandInt2 = operandInts[1] ?? 0;
    const operandInt3 = operandInts[2];
    const byte1 = (operandInt2 << 6) + (operandInt1 << 4) + this.opcode;
    return operandInt3 === undefined ? [byte1] : [byte1, operandInt3];
  }

  getSizeInBytes() {
    return this.sizeInBytes;
  }

  setLabel(label: string) {
    this.label = label;
  }

  setOffsetInBytes(offsetInBytes: number) {
    this.offsetInBytes = offsetInBytes;
  }

  getOffsetInBytes() {
    return this.offsetInBytes;
  }

  getOperands() {
    return this.operands;
  }

  getIsData() {
    return this.isData;
  }

  getLabel() {
    return this.label;
  }

  getMnemonic() {
    return this.mnemonic;
  }

  getAliasMnemonic() {
    return this.aliasMnemonic;
  }

  getAliasOperands() {
    return this.aliasOperands;
  }

  clone() {
    const operandsClone = this.operands.map((operand) => operand.clone());
    const aliasOperandsClone = this.aliasOperands?.map((operand) => operand.clone());
    const clone = new AsmLine(this.mnemonic, operandsClone, this.aliasMnemonic, aliasOperandsClone);
    if (this.label !== undefined) {
      clone.setLabel(this.label);
    }
    if (this.offsetInBytes !== undefined) {
      clone.setOffsetInBytes(this.offsetInBytes);
    }
    return clone;
  }

  toString() {
    const prefix = this.label === undefined ? '' : `${this.label} `;
    const operandStrings = this.operands.map((operand) => operand.toString()).join(' ');
    return `${prefix}${this.mnemonic} ${operandStrings}`;
  }

  getDataValue() {
    if (this.isData) {
      return this.operands[0].toInt();
    } else {
      throw new Error(`Trying to access data value of non-data AsmLine "${this.toString()}"`);
    }
  }

  isHalt() {
    const isSelfBranch = this.mnemonic === 'BRA' && this.operands[2].getLabel() === this.label;
    const isReturnOne = this.mnemonic === 'RET' && this.operands[0]?.toInt() === 1;
    return isSelfBranch || isReturnOne;
  }
}
