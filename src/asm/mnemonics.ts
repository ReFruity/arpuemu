export const DATA_MNEMONIC = 'DW';
export const INSTRUCTION_MNEMONICS = [
  'ADD',
  'SUB',
  'RSH',
  'INC',
  'DEC',
  'BIT',
  'CAL',
  'RET',
  'PST',
  'PLD',
  'IMM',
  'STR',
  'LOD',
  'SOP',
  'BRA',
  'MOV',
];
export const ALL_MNEMONICS = [DATA_MNEMONIC, ...INSTRUCTION_MNEMONICS];
export const EXTRA_BYTE_INSTRUCTIONS = [
  'BIT',
  'IMM',
  'BRA',
];
export const ALIASES = {
};
