const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan']
const scales = ['', 'bin', 'milyon', 'milyar', 'trilyon']

function hundreds(n: number): string[] {
  const h = Math.floor(n / 100), rest = n % 100
  const out: string[] = []
  if (h > 0) out.push(h === 1 ? 'yüz' : `${ones[h]} yüz`)
  if (rest >= 10) out.push(tens[Math.floor(rest / 10)])
  if (rest % 10) out.push(ones[rest % 10])
  return out
}

/** Sayıyı okunuşuna çevirir: 12345 → "on iki bin üç yüz kırk beş". Türkçede "bir bin" denmez. */
export function numberWords(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'sıfır'
  const parts: string[] = []
  for (let scale = 0; n > 0; scale++, n = Math.floor(n / 1000)) {
    const group = n % 1000
    if (group === 0) continue
    const words = group === 1 && scale === 1 ? [] : hundreds(group)
    parts.unshift([...words, scales[scale]].filter(Boolean).join(' '))
  }
  return parts.join(' ')
}

/** Tutarın okunuşu (form kutusunun altında gösterilir): 1250.5 → "bin iki yüz elli lira elli kuruş". */
export function amountWords(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100
  const lira = Math.floor(rounded)
  const kurus = Math.round((rounded - lira) * 100)
  let text = `${numberWords(lira)} lira`
  if (kurus > 0) text += ` ${numberWords(kurus)} kuruş`
  return text
}

/** "1.250,50", "1250,5", "1250.5" → 1250.5; "25.000" → 25000 (noktalar üçerli gruplarsa binlik ayracıdır). Boşsa NaN. */
export function parseAmount(text: string): number {
  const t = text.replace(/\s|₺|TL/gi, '')
  if (!t) return NaN
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t
  return Number(normalized)
}
