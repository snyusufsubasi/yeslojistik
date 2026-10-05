import { useSyncExternalStore } from 'react'

/**
 * Görünüm: "classic" (bugünkü düzen) ya da "new" (pratikortam gibi menü/sekmeler, daha sade ekranlar).
 * docs/KOLAYLASTIRMA-UYGULAMA.md: yeni görünüm müşteri onaylayana kadar bir seçenek; F6'da varsayılan olur.
 */
export type UiMode = 'classic' | 'new'
export const DEFAULT_UI_MODE: UiMode = 'classic'
const KEY = 'yes.uiMode'
const listeners = new Set<() => void>()

function read(): UiMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'new' || v === 'classic' ? v : DEFAULT_UI_MODE
  } catch { return DEFAULT_UI_MODE }
}

let current: UiMode = read()

function apply(mode: UiMode) { document.documentElement.dataset.ui = mode }

/** Açılışta kayıtlı görünümü uygular (main.tsx). */
export function applySavedUiMode() { current = read(); apply(current) }

export function setUiMode(mode: UiMode) {
  current = mode
  apply(mode)
  try { localStorage.setItem(KEY, mode) } catch { /* gizli pencere: yalnızca bu oturum */ }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }

export function useUiMode(): [UiMode, (m: UiMode) => void] {
  const mode = useSyncExternalStore(subscribe, () => current, () => DEFAULT_UI_MODE)
  return [mode, setUiMode]
}

export const useIsNewUi = () => useUiMode()[0] === 'new'
