/**
 * Grafik renkleri (recharts): Otoyol paletinden, sabit sırayla.
 * accent yeşil = ciro / ana seri, sarı = maliyet, mavi = tek serili dağılımlar, kırmızı = eksi / zarar.
 * Değerler index.css'teki jetonlarla aynı; recharts SVG'ye renk dizesi istediği için burada tekrar yazılır.
 */
export const chart = {
  accent: '#0d6a51',
  hl: '#f0c02c',
  info: '#2b5c99',
  bad: '#b2302a',
  /** Eksen yazısı (muted), ızgara ve eksen çizgisi (line), üzerine gelince sütun zemini (surface-2) */
  tick: '#56685f',
  grid: '#d3ddd9',
  cursor: '#e8eeec',
} as const

/** Eksen rakamları Overpass Mono, küçük ve sakin */
export const chartTick = { fill: chart.tick, fontSize: 12, fontFamily: '"Overpass Mono", ui-monospace, monospace' }
