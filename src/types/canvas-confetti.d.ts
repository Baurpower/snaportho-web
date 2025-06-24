declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    [key: string]: unknown;
  }
  const confetti: (opts?: ConfettiOptions) => void;
   export default confetti;
 }