import { useState } from 'react'

export type TextSize = 'md' | 'lg' | 'xl'
const KEY = 'yes.textSize'

function read(): TextSize {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'lg' || v === 'xl' ? v : 'md'
  } catch { return 'md' }
}

function apply(size: TextSize) {
  if (size === 'md') document.documentElement.removeAttribute('data-text')
  else document.documentElement.dataset.text = size
}

/** Açılışta kayıtlı yazı boyutunu uygular (main.tsx). */
export function applySavedTextSize() { apply(read()) }

/** Kullanıcı menüsündeki "Yazı boyutu" seçimi: Normal / Büyük / Çok büyük. Tarayıcıda saklanır. */
export function useTextSize() {
  const [size, setSize] = useState<TextSize>(read)
  const change = (s: TextSize) => {
    setSize(s)
    apply(s)
    try { localStorage.setItem(KEY, s) } catch { /* gizli pencere: yalnızca bu oturum */ }
  }
  return [size, change] as const
}
