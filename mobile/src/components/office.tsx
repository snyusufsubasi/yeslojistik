import { useMemo, useState, type ReactNode } from 'react'
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from '../lib/theme'

/** 12.345,67 TL */
export const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'
/** 12.346 TL (kartlarda) */
export const tl0 = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** "29.09.2026" → "2026-09-29"; geçersizse null */
export function parseTrDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : null
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return Number.isNaN(new Date(iso + 'T12:00:00').getTime()) ? null : iso
}
export const trDate = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '')

export function Stat({ label, value, sub, tone, onPress }: { label: string; value: string; sub?: string; tone?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.stat} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, tone ? { color: tone } : null]}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </Pressable>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      {children}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  )
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />
}

/** Tarih: GG.AA.YYYY yazılır ya da "Bugün / Yarın" seçilir. value ISO (YYYY-AA-GG). */
export function DateInput({ label, value, onChange, optional }: { label: string; value: string | null; onChange: (v: string | null) => void; optional?: boolean }) {
  const [text, setText] = useState(trDate(value))
  const set = (iso: string | null) => { onChange(iso); setText(trDate(iso)) }
  return (
    <Field label={label}>
      <Input value={text} placeholder="GG.AA.YYYY" accessibilityLabel={label} keyboardType="numbers-and-punctuation"
        onChangeText={(t) => { setText(t); const iso = parseTrDate(t); if (iso || (optional && !t.trim())) onChange(iso) }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Bugün" onPress={() => set(todayIso())} />
        <Chip label="Yarın" onPress={() => set(addDays(todayIso(), 1))} />
        {optional && <Chip label="Boş" onPress={() => set(null)} />}
      </View>
    </Field>
  )
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: !!active }}>
      <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </Pressable>
  )
}

/** Aranabilir seçim listesi (müşteri, araç, şoför, tedarikçi...). */
export function Picker({ label, value, options, onChange, placeholder = 'Seçin', optional }:
  { label: string; value: number | null; options: { id: number; label: string }[]; onChange: (id: number | null) => void; placeholder?: string; optional?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const selected = options.find((o) => o.id === value)
  const filtered = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('tr')
    return t ? options.filter((o) => o.label.toLocaleLowerCase('tr').includes(t)) : options
  }, [q, options])
  return (
    <Field label={label}>
      <Pressable onPress={() => setOpen(true)} style={s.input} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={{ fontSize: 16, color: selected ? colors.text : colors.muted }}>{selected?.label ?? placeholder}</Text>
      </Pressable>
      <Modal visible={open} animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, paddingTop: 48, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            <Input style={{ flex: 1 }} value={q} onChangeText={setQ} placeholder="Ara..." autoFocus={Platform.OS !== 'web'} accessibilityLabel="Ara" />
            <Pressable onPress={() => setOpen(false)} hitSlop={10}><Text style={{ color: colors.brand, fontSize: 16 }}>Kapat</Text></Pressable>
          </View>
          <FlatList
            data={optional ? [{ id: -1, label: '— Seçilmedi —' }, ...filtered] : filtered}
            keyExtractor={(o) => String(o.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item.id === -1 ? null : item.id); setOpen(false); setQ('') }} style={s.option}>
                <Text style={[s.optionText, item.id === value && { color: colors.brand, fontWeight: '700' }]}>{item.label}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </Field>
  )
}

const s = StyleSheet.create({
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.muted, fontSize: 13 },
  statValue: { color: colors.navy, fontSize: 22, fontWeight: '800', marginTop: 2 },
  statSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, backgroundColor: '#fff', color: colors.text },
  chip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.blueSoft },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: colors.brand },
  option: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  optionText: { fontSize: 16, color: colors.text },
})
