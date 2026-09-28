import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { notify } from '../lib/dialog'
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

/** "1.234,50" veya "1234.5" → 1234.5 */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, '')
  if (!t) return null
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

const money = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'

/** Şoförün yolda yaptığı masrafı (yakıt, otoyol...) seferine yazar. */
export function ExpenseCard({ tripId }: { tripId: string }) {
  const qc = useQueryClient()
  const [category, setCategory] = useState<DriverExpenseCategory>('Fuel')
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [odometer, setOdometer] = useState('')
  const [note, setNote] = useState('')
  const list = useQuery({ queryKey: ['trip', tripId, 'expenses'], queryFn: () => api.get<DriverExpense[]>(`/driver/trips/${tripId}/expenses`) })
  const fuel = category === 'Fuel'

  const save = useMutation({
    mutationFn: () => {
      const a = parseNumber(amount)
      const l = fuel ? parseNumber(liters) : null
      const km = fuel ? parseNumber(odometer) : null
      if (a == null || Number.isNaN(a) || a <= 0) throw new Error('Tutarı girin (ör. 4500 veya 4.500,50).')
      if (Number.isNaN(l) || (l != null && l <= 0)) throw new Error('Litreyi sayı olarak girin.')
      if (Number.isNaN(km) || (km != null && (km < 0 || !Number.isInteger(km)))) throw new Error('Kilometreyi tam sayı olarak girin.')
      return api.post<DriverExpense>(`/driver/trips/${tripId}/expenses`, {
        category, amount: a, liters: l, odometer: km, description: note.trim() || null,
      })
    },
    onSuccess: () => {
      setAmount(''); setLiters(''); setOdometer(''); setNote('')
      qc.invalidateQueries({ queryKey: ['trip', tripId, 'expenses'] })
      notify('Kaydedildi', 'Masraf ofise iletildi.')
    },
    onError: (e) => notify('Kaydedilemedi', e instanceof Error ? e.message : 'Masraf kaydedilemedi.'),
  })

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
      <Button title="Masrafı Kaydet" onPress={() => save.mutate()} loading={save.isPending} />
      <Text style={s.hint}>Fişin fotoğrafını aşağıdaki "Fotoğraf Çek" ile ekleyebilirsiniz.</Text>
      {list.data && list.data.length > 0 && (
        <View style={{ marginTop: 4, gap: 2 }}>
          {list.data.map((e) => (
            <Text key={e.id} style={s.item}>
              • {formatDate(e.date)} · {labelOf[e.category] ?? e.category} · {money(e.amount)}
              {e.liters ? ` · ${e.liters.toLocaleString('tr-TR')} L` : ''}{e.odometer ? ` · ${e.odometer.toLocaleString('tr-TR')} km` : ''}
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
})
