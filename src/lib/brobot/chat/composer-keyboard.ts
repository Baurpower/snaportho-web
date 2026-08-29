export type ComposerKeyEvent = {
  key: string;
  shiftKey: boolean;
  nativeEvent?: { isComposing?: boolean };
};

export function shouldSubmitComposerOnEnter(
  event: ComposerKeyEvent,
  input: { isCoarsePointer: boolean; isNarrowViewport: boolean },
): boolean {
  if (event.key !== 'Enter' || event.shiftKey) return false;
  if (event.nativeEvent?.isComposing) return false;
  if (input.isCoarsePointer || input.isNarrowViewport) return false;
  return true;
}
