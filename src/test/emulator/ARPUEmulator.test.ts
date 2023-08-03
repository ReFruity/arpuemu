import { describe, expect, it } from 'vitest';
import { ARPUEmulator, defaultARPUEmulatorState } from '../../emulator/ARPUEmulator.ts';

describe('ARPUEmulator', () => {
  it('should load immediate via IMM instruction', () => {
    const asmCode = 'IMM 0 0 42';
    const emulator = new ARPUEmulator(asmCode);
    emulator.step();
    expect(emulator.getState()).toEqual({
      ...defaultARPUEmulatorState(asmCode),
      registers: [42, 0, 0, 0],
      PC: 2,
      lineIndex: 1,
    });
  });

  it('should increment via INC instruction', () => {
    const asmCode = 'INC R1';
    const emulator = new ARPUEmulator(asmCode);
    emulator.step();
    expect(emulator.getState()).toEqual({
      ...defaultARPUEmulatorState(asmCode),
      registers: [1, 0, 0, 0],
      PC: 1,
      lineIndex: 1,
    });
  });

  it('should read port via PLD instruction', () => {
    const asmCode = 'PLD R1 0';
    const defaultState = defaultARPUEmulatorState(asmCode);
    const emulator = new ARPUEmulator(asmCode);
    emulator.step();
    expect(emulator.getState()).toEqual({
      ...defaultState,
      isWaitingPortInput: true,
    });
    emulator.portInput(2);
    expect(emulator.getState()).toEqual({
      ...defaultState,
      registers: [2, 0, 0, 0],
      inputPorts: [2, 0, 0, 0],
      PC: 1,
      lineIndex: 1,
    });
  });

  it('should write to port via PST instruction', () => {
    const asmLines = [
      'IMM R1 0 3',
      'PST R1 0',
    ];
    const asmCode = asmLines.join('\n');
    const defaultState = defaultARPUEmulatorState(asmCode);
    const emulator = new ARPUEmulator(asmCode);
    emulator.step();
    emulator.step();
    expect(emulator.getState()).toEqual({
      ...defaultState,
      registers: [3, 0, 0, 0],
      outputPorts: [3, 0, 0, 0],
      PC: 3,
      lineIndex: 2,
    });
  });

  describe('branch', () => {
    describe('unconditional', () => {
      it('should make a forward jump anyway', () => {
        const asmLines = [
          'BRA 0 0 .branch',
          'IMM R1 0 1',
          '.branch',
          'IMM R1 0 2',
        ];
        const asmCode = asmLines.join('\n');
        const defaultState = defaultARPUEmulatorState(asmCode);
        const emulator = new ARPUEmulator(asmCode);
        emulator.step();
        expect(emulator.getState()).toEqual({
          ...defaultState,
          PC: 4,
          lineIndex: 2,
        });
      });

      it('should make a backward jump anyway', () => {
        const asmLines = [
          '.branch',
          'IMM R1 0 2',
          'BRA 0 0 .branch',
          'IMM R1 0 1',
        ];
        const asmCode = asmLines.join('\n');
        const defaultState = defaultARPUEmulatorState(asmCode);
        const emulator = new ARPUEmulator(asmCode);
        emulator.getState().PC = 2;
        emulator.getState().lineIndex = 1;
        emulator.step();
        expect(emulator.getState()).toEqual({
          ...defaultState,
          PC: 0,
          lineIndex: 0,
        });
      });

    });

    describe('conditional', () => {
      describe('without negate', () => {
        it('should make a jump when condition ZF is true', () => {
          const asmLines = [
            'BRA 0 0b01 .branch',
            'IMM R1 0 1',
            '.branch',
            'IMM R1 0 2',
          ];
          const asmCode = asmLines.join('\n');
          const defaultState = defaultARPUEmulatorState(asmCode);
          const emulator = new ARPUEmulator(asmCode);
          emulator.getState().ZF = true;
          emulator.step();
          expect(emulator.getState()).toEqual({
            ...defaultState,
            // TODO: ZF should be false after jump if PC != 0
            ZF: true,
            PC: 4,
            lineIndex: 2,
          });
        });

        it('should make a jump when condition COUT is true', () => {
          const asmLines = [
            'BRA 1 0b01 .branch',
            'IMM R1 0 1',
            '.branch',
            'IMM R1 0 2',
          ];
          const asmCode = asmLines.join('\n');
          const defaultState = defaultARPUEmulatorState(asmCode);
          const emulator = new ARPUEmulator(asmCode);
          emulator.getState().COUTF = true;
          emulator.step();
          expect(emulator.getState()).toEqual({
            ...defaultState,
            COUTF: true,
            PC: 4,
            lineIndex: 2,
          });
        });
      });

      describe('with negate', () => {
        it('should make a jump when condition ZF is false', () => {
          const asmLines = [
            'BRA 0 0b11 .branch',
            'IMM R1 0 1',
            '.branch',
            'IMM R1 0 2',
          ];
          const asmCode = asmLines.join('\n');
          const defaultState = defaultARPUEmulatorState(asmCode);
          const emulator = new ARPUEmulator(asmCode);
          emulator.step();
          expect(emulator.getState()).toEqual({
            ...defaultState,
            PC: 4,
            lineIndex: 2,
          });
        });

        it('should make a jump when condition COUT is false', () => {
          const asmLines = [
            'BRA 1 0b11 .branch',
            'IMM R1 0 1',
            '.branch',
            'IMM R1 0 2',
          ];
          const asmCode = asmLines.join('\n');
          const defaultState = defaultARPUEmulatorState(asmCode);
          const emulator = new ARPUEmulator(asmCode);
          emulator.step();
          expect(emulator.getState()).toEqual({
            ...defaultState,
            PC: 4,
            lineIndex: 2,
          });
        });
      });
    });
  });
});