import { z } from 'zod'

// Form doğrulama mesajları Türkçe: alanına özel mesajı olmayan hatalar için sade bir dil ("Invalid input" yerine).
z.config(z.locales.tr())
z.config({
  customError: (issue) => {
    if (issue.code === 'invalid_type') {
      const empty = issue.input === undefined || issue.input === null || issue.input === '' || Number.isNaN(issue.input)
      if (issue.expected === 'number') return empty ? 'Sayı girin.' : 'Geçerli bir sayı girin.'
      if (empty) return 'Bu alan zorunlu.'
    }
    const n = (v: unknown) => Number(v).toLocaleString('tr-TR')
    if (issue.code === 'too_small') {
      if (issue.origin === 'string') return Number(issue.minimum) <= 1 ? 'Bu alan zorunlu.' : `En az ${n(issue.minimum)} karakter olmalı.`
      if (issue.origin === 'number') return issue.inclusive ? `En az ${n(issue.minimum)} olmalı.` : `${n(issue.minimum)} değerinden büyük olmalı.`
    }
    if (issue.code === 'too_big') {
      if (issue.origin === 'string') return `En fazla ${n(issue.maximum)} karakter olabilir.`
      if (issue.origin === 'number') return issue.inclusive ? `En fazla ${n(issue.maximum)} olabilir.` : `${n(issue.maximum)} değerinden küçük olmalı.`
    }
    if (issue.code === 'invalid_format' && issue.format === 'email') return 'Geçerli bir e-posta adresi girin.'
    return undefined
  },
})
