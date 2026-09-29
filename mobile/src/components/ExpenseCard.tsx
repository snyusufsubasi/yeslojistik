import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { notify } from '../lib/dialog'
import { enqueue, useOutbox, type ExpensePayload } from '../lib/outbox'
import { pickPhoto, type PickedPhoto } from '../lib/photos'
import { colors, formatDate } from '../lib/theme'
import type { DriverExpense, DriverExpenseCategory } from '../lib/types'
import { Button, Card } from './ui'

const categories: { value: DriverExpenseCategory; label: string }[] = [
  { value: 'Fuel', label: 'Yakıt' },
  { value: 'Toll', label: 'Otoyol / Köprü' },
  { value: 'Maintenance', label: 'Bakım / Onarım' },
  { value: 'Other', label: 'Diğer' },
]
const labelOf = Object.fromEntries(categories.map((c) => [c.value, c.label])) as Record<DriverExpenseCategory, string>

/** "1.234,50", "14.500" (binlik) veya "1234.5" → sayı */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, '')
  if (!t) return null
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

const money = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'

/**
 * Şoförün yolda yaptığı masrafı (yakıt, otoyol...) seferine yazar. Masraf çevrimdışı kuyruğa girer, ofiste "onay bekliyor"
 * olarak görünür. İsteğe bağlı fiş fotoğrafı masrafla birlikte gider.
 */
export function ExpenseCard({ tripId }: { tripId: number }) {
  const [category, setCategory] = useState<DriverExpenseCategory>('Fuel')
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [odometer, setOdometer] = useState('')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<PickedPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const list = useQuery({ queryKey: ['trip', String(tripId), 'expenses'], queryFn: () => api.get<DriverExpense[]>(`/driver/trips/${tripId}/expenses`) })
  const pending = useOutbox().filter((i) => i.tripId === tripId && i.type === 'expense')
  const fuel = category === 'Fuel'

  const save = async () => {
    const a = parseNumber(amount)
    const l = fuel ? parseNumber(liters) : null
    const km = fuel ? parseNumber(odometer) : null
    if (a == null || Number.isNaN(a) || a <= 0) return notify('Kaydedilemedi', 'Tutarı girin (ör. 4500 veya 4.500,50).')
    if (Number.isNaN(l) || (l != null && l <= 0)) return notify('Kaydedilemedi', 'Litreyi sayı olarak girin.')
    if (Number.isNaN(km) || (km != null && (km < 0 || !Number.isInteger(km)))) return notify('Kaydedilemedi', 'Kilometreyi tam sayı olarak girin.')
    setSaving(true)
    try {
      const payload: ExpensePayload = { category, amount: a, liters: l, odometer: km, description: note.trim() || null }
      await enqueue({ type: 'expense', tripId, label: `${labelOf[category]} · ${money(a)}${l ? ` · ${l.toLocaleString('tr-TR')} L` : ''}${km ? ` · ${km.toLocaleString('tr-TR')} km` : ''}`,
        payload, fileUri: receipt?.uri, fileMime: receipt?.mimeType })
      setAmount(''); setLiters(''); setOdometer(''); setNote(''); setReceipt(null)
    } catch (e) {
      notify('Kaydedilemedi', e instanceof Error ? e.message : 'Masraf kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <Text style={s.section}>Masraf / Yakıt</Text>
      <View style={s.chips} accessibilityRole="radiogroup">
        {categories.map((c) => (
          <Pressable key={c.value} accessibilityRole="radio" accessibilityState={{ selected: category === c.value }}
            onPress={() => setCategory(c.value)} style={[s.chip, category === c.value && s.chipOn]}>
            <Text style={[s.chipText, category === c.value && s.chipTextOn]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={s.input} placeholder="Tutar (TL)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} accessibilityLabel="Tutar" />
      {fuel && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[s.input, { flex: 1, minWidth: 0 }]} placeholder="Litre" keyboardType="decimal-pad" value={liters} onChangeText={setLiters} accessibilityLabel="Litre" />
          <TextInput style={[s.input, { flex: 1, minWidth: 0 }]} placeholder="Araç km" keyboardType="number-pad" value={odometer} onChangeText={setOdometer} accessibilityLabel="Araç kilometresi" />
        </View>
      )}
      {fuel && <Text style={s.hint}>Depoyu doldurduysanız göstergedeki km'yi yazın; yakıt tüketimi buna göre hesaplanır.</Text>}
      <TextInput style={s.input} placeholder="Not (isteğe bağlı)" value={note} onChangeText={setNote} accessibilityLabel="Masraf notu" />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Button title={receipt ? 'Fişi Değiştir' : 'Fiş Fotoğrafı'} variant="outline" style={{ flex: 1 }}
          onPress={async () => { const p = await pickPhoto(true); if (p) setReceipt(p) }} />
        {receipt && <Text style={s.ok}>✓ Fiş eklendi</Text>}
      </View>
      <Button title="Masrafı Kaydet" onPress={save} loading={saving} />
      {((list.data?.length ?? 0) > 0 || pending.length > 0) && (
        <View style={{ marginTop: 4, gap: 2 }}>
          {pending.map((e) => <Text key={e.id} style={[s.item, { color: colors.amber }]}>• {e.label} (gönderiliyor)</Text>)}
          {list.data?.map((e) => (
            <Text key={e.id} style={s.item}>
              • {formatDate(e.date)} · {labelOf[e.category] ?? e.category} · {money(e.amount)}
              {e.liters ? ` · ${e.liters.toLocaleString('tr-TR')} L` : ''}{e.odometer ? ` · ${e.odometer.toLocaleString('tr-TR')} km` : ''}
              {e.hasReceipt ? ' · fişli' : ''}{e.approvalStatus === 'Pending' ? ' · onay bekliyor' : e.approvalStatus === 'Rejected' ? ' · reddedildi' : ''}
            </Text>
          ))}
        </View>
      )}
    </Card>
  )
}

const s = StyleSheet.create({
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff' },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.blueSoft },
  chipText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: colors.brand },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  hint: { color: colors.muted, fontSize: 13 },
  item: { color: colors.text, fontSize: 14 },
  ok: { color: colors.green, fontWeight: '600' },
})
