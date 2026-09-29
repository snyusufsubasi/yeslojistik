/** Türkçe harfleri sadeleştirir: "şahin" ile "Sahin", "ÇELİK" ile "celik" aynı sonucu verir. */
export function normalizeSearch(s: string) {
  return s.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}
