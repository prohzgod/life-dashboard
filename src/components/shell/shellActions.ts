import { createContext, useContext } from 'react';

export type ShellActions = { openCapture: () => void; openSearch: () => void };

const noop = () => {};
export const ShellActionsContext = createContext<ShellActions>({ openCapture: noop, openSearch: noop });

/** Opens the shell's overlays (quick capture, search) from inside a screen. */
export function useShellActions(): ShellActions {
  return useContext(ShellActionsContext);
}
