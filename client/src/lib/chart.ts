/**
 * Grafik renkleri (recharts): Hark paletinden (docs/TASARIM-HARK.md), sabit sırayla.
 * accent çivit = ciro / ana seri, sarı = maliyet, deniz mavisi = tek serili dağılımlar, kırmızı = eksi / zarar.
 * Değerler index.css'teki jetonlarla aynı; recharts SVG'ye renk dizesi istediği için burada tekrar yazılır.
 */
export const chart = {
  accent: '#4652c9',
  hl: '#f2b632',
  info: '#0b6c99',
  bad: '#c0362c',
  /** Eksen yazısı (muted), ızgara ve eksen çizgisi (line), üzerine gelince sütun zemini (surface-2) */
  tick: '#6b6a65',
  grid: '#e6e5e1',
  cursor: '#f3f3f0',
} as const

/** Eksen rakamları Inter (eşit genişlikli rakamlar), küçük ve sakin */
export const chartTick = { fill: chart.tick, fontSize: 12, fontFamily: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif' }
