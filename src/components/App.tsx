import { MainPage } from './main-page/MainPage.tsx';
import { createContext, useState } from 'react';
import { ARPUEmulator, ARPUEmulatorState } from '../emulator/ARPUEmulator.ts';
import { parseImmediateValue } from '../asm/parse.ts';
import { WORD_SIZE } from '../const/emulator-constants.ts';

export interface EmulatorAndStateType {
  emulator: ARPUEmulator;
  emulatorState: ARPUEmulatorState;
}

export interface EmulatorContextType {
  emulatorState: ARPUEmulatorState | null;
  initEmulator: (asmCode: string) => void;
  step: () => void;
  portInput: (value: string) => void;
  setRAM: (binaryData: number[]) => void;
}

const emulatorFunctionStub = () => {
  throw new Error('This context should be initialized inside a component with a state');
};

export const EmulatorContext = createContext<EmulatorContextType>({
  emulatorState: null,
  initEmulator: emulatorFunctionStub,
  step: emulatorFunctionStub,
  portInput: emulatorFunctionStub,
  setRAM: emulatorFunctionStub,
});

export function App() {
  const [emulatorAndState, setEmulatorAndState] = useState<EmulatorAndStateType | null>(null);

  function initEmulator(asmCode: string) {
    const emulator = new ARPUEmulator(asmCode, true);
    setEmulatorAndState( {
      emulator,
      emulatorState: emulator.getState(),
    });
  }

  function step() {
    const error  = new Error('Invalid state: step function is called on uninitialized emulator');

    if (emulatorAndState === null) {
      throw error;
    }

    emulatorAndState.emulator.step();

    setEmulatorAndState((prevState) => {
      if (prevState === null) {
        throw error;
      }

      return {
        emulator: prevState.emulator,
        emulatorState: prevState.emulator.getState(),
      };
    });
  }

  function portInput(value: string) {
    const error  = new Error('Invalid state: portInput function is called on uninitialized emulator');

    if (emulatorAndState === null) {
      throw error;
    }

    const immediate = parseImmediateValue(value);

    if (immediate >= WORD_SIZE) {
      throw new Error('Port input value is more than or equal to 256 (1 byte)');
    }

    emulatorAndState.emulator.portInput(immediate);

    setEmulatorAndState((prevState) => {
      if (prevState === null) {
        throw error;
      }

      return {
        emulator: prevState.emulator,
        emulatorState: prevState.emulator.getState(),
      };
    });
  }

  function setRAM(binaryData: number[]) {
    const error  = new Error('Invalid state: setRAM function is called on uninitialized emulator');

    if (emulatorAndState === null) {
      throw error;
    }

    emulatorAndState.emulator.setRAM(binaryData);

    setEmulatorAndState((prevState) => {
      if (prevState === null) {
        throw error;
      }

      return {
        emulator: prevState.emulator,
        emulatorState: prevState.emulator.getState(),
      };
    });
  }

  return (
    <EmulatorContext.Provider value={{
      emulatorState: emulatorAndState === null ? null: emulatorAndState.emulatorState,
      initEmulator,
      step,
      portInput,
      setRAM,
    }}>
      <MainPage />
    </EmulatorContext.Provider>
  );
}
