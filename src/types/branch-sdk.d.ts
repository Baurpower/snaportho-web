// types/branch-sdk.d.ts
declare global {
  interface Window {
    branch: {
      init: (...args: unknown[]) => void;
      track: (event: string, data?: Record<string, unknown>) => void;
      subscribe?: (...args: unknown[]) => void;
    };
  }
}

declare module 'branch-sdk';

export {};
