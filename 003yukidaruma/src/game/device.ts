const coarsePointer =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)')
    : null;

/**
 * タッチ端末（スマホ・タブレット）かどうか。
 * 画面の案内文と効果音の音量をここで切り替える。
 */
export const isTouchDevice = (): boolean => coarsePointer?.matches ?? false;
