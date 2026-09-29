import { useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { parseNumber } from '../../components/ExpenseCard'
import { Chip, DateInput, Field, Input, Picker, todayIso, tl } from '../../components/office'
import { Button } from '../../components/ui'
import { api } from '../../lib/api'
import { notify } from '../../lib/dialog'
import type { LookupItem } from '../../lib/officeTypes'
import { pickPhoto, type PickedPhoto } from '../../lib/photos'
import { colors } from '../../lib/theme'

const categories = [
  ['Fuel', 'Yakıt'], ['Maintenance', 'Bakım/Onarım'], ['Toll', 'Otoyol/Köprü'], ['Tire', 'Lastik'], ['Insurance', 'Sigorta'],
  ['Tax', 'Vergi/Harç'], ['DriverAllowance', 'Harcırah'], ['Other', 'Diğer'],
] as const

/** Ofisten gider girişi (fişli). Tedarikçi seçilip "vadeli" işaretlenirse tedarikçiye borç yazılır. */
export default function ExpenseScreen() {
  const qc = useQueryClient()
  const [category, setCategory] = useState<string>('Fuel')
  const [date, setDate] = useState<string | null>(todayIso())
  const [amount, setAmount] = useState('')
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [onCredit, setOnCredit] = useState(false)
  const [description, setDescription] = useState('')
  const [receipt, setReceipt] = useState<PickedPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const vehicles = useQuery({ queryKey: ['vehicles', 'lookup'], queryFn: () => api.get<LookupItem[]>('/vehicles/lookup') })
  const suppliers = useQuery({ queryKey: ['suppliers', 'lookup'], queryFn: () => api.get<LookupItem[]>('/suppliers/lookup') })

  const save = async () => {
    const a = parseNumber(amount)
    if (!date) return notify('Eksik bilgi', 'Tarihi GG.AA.YYYY olarak yazın.')
    if (a == null || Number.isNaN(a) || a <= 0) return notify('Eksik bilgi', 'Tutarı girin.')
    if (onCredit && !supplierId) return notify('Eksik bilgi', 'Vadeli gider için tedarikçiyi seçin.')
    setSaving(true)
    try {
      const created = await api.post<{ id: number }>('/expenses', {
        category, amount: a, date, vehicleId, tripId: null, description: description.trim() || null, supplierId, isOnCredit: onCredit,
      })
      if (receipt) {
        const form = new FormData()
        if (Platform.OS === 'web') form.append('file', await (await fetch(receipt.uri)).blob(), receipt.name)
        else form.append('file', { uri: receipt.uri, name: receipt.name, type: receipt.mimeType } as unknown as Blob)
        await api.post(`/expenses/${created.id}/receipt`, form)
      }
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      notify('Kaydedildi', `${tl(a)} gider kaydedildi.`)
      router.back()
    } catch (e) {
      notify('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Gider Ekle' }} />
      <Field label="Kategori">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map(([v, l]) => <Chip key={v} label={l} active={category === v} onPress={() => setCategory(v)} />)}
        </View>
      </Field>
      <DateInput label="Tarih" value={date} onChange={setDate} />
      <Field label="Tutar (TL)"><Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="Tutar" placeholder="0,00" /></Field>
      <Picker label="Araç" value={vehicleId} onChange={setVehicleId} options={vehicles.data ?? []} optional placeholder="Genel gider (araçsız)" />
      <Picker label="Tedarikçi" value={supplierId} onChange={setSupplierId} options={suppliers.data ?? []} optional placeholder="Yok" />
      {supplierId && <Chip label={onCredit ? '✓ Vadeli (tedarikçiye borç yazılır)' : 'Vadeli değil (peşin ödendi)'} active={onCredit} onPress={() => setOnCredit((v) => !v)} />}
      <Field label="Açıklama"><Input value={description} onChangeText={setDescription} accessibilityLabel="Açıklama" /></Field>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Button title={receipt ? 'Fişi Değiştir' : 'Fiş Fotoğrafı'} variant="outline" style={{ flex: 1 }}
          onPress={async () => { const p = await pickPhoto(true); if (p) setReceipt(p) }} />
        {receipt && <Text style={{ color: colors.green, fontWeight: '600' }}>✓ Fiş eklendi</Text>}
      </View>
      <Button title="Kaydet" color={colors.green} onPress={save} loading={saving} />
    </ScrollView>
  )
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg } })
