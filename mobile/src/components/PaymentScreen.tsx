import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { parseNumber } from './ExpenseCard'
import { Chip, DateInput, Field, Input, Picker, todayIso, tl } from './office'
import { Button } from './ui'
import { api } from '../lib/api'
import { notify } from '../lib/dialog'
import { paymentMethods, type LookupItem, type PaymentMethod } from '../lib/officeTypes'
import { colors } from '../lib/theme'

/**
 * Müşteriden tahsilat (kind=customer) ya da tedarikçiye ödeme (kind=supplier). Tutar eski borçtan başlayarak kapatır.
 * Web panelindeki formla aynı uç noktayı kullanır.
 */
export function PaymentScreen({ kind }: { kind: 'customer' | 'supplier' }) {
  const params = useLocalSearchParams<{ id?: string }>()
  const qc = useQueryClient()
  const customer = kind === 'customer'
  const [partyId, setPartyId] = useState<number | null>(params.id ? Number(params.id) : null)
  const [date, setDate] = useState<string | null>(todayIso())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('BankTransfer')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const lookup = useQuery({
    queryKey: [customer ? 'customers' : 'suppliers', 'lookup'],
    queryFn: () => api.get<LookupItem[]>(customer ? '/customers/lookup' : '/suppliers/lookup'),
  })

  const save = async () => {
    const a = parseNumber(amount)
    if (!partyId) return notify('Eksik bilgi', customer ? 'Müşteriyi seçin.' : 'Tedarikçiyi seçin.')
    if (!date) return notify('Eksik bilgi', 'Tarihi GG.AA.YYYY olarak yazın.')
    if (a == null || Number.isNaN(a) || a <= 0) return notify('Eksik bilgi', 'Tutarı girin (ör. 15.000 veya 15000,50).')
    setSaving(true)
    try {
      const body = customer
        ? { customerId: partyId, invoiceId: null, date, amount: a, method, description: description.trim() || null }
        : { supplierId: partyId, tripId: null, date, amount: a, method, description: description.trim() || null }
      await api.post(customer ? '/payments' : '/supplier-payments', body)
      await qc.invalidateQueries({ queryKey: [customer ? 'customers' : 'suppliers'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      notify('Kaydedildi', `${tl(a)} ${customer ? 'tahsilat' : 'ödeme'} kaydedildi.`)
      router.back()
    } catch (e) {
      notify('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: customer ? 'Tahsilat Ekle' : 'Ödeme Yap' }} />
      <Picker label={customer ? 'Müşteri' : 'Tedarikçi'} value={partyId} onChange={setPartyId} options={lookup.data ?? []} />
      <DateInput label="Tarih" value={date} onChange={setDate} />
      <Field label="Tutar (TL)"><Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="Tutar" placeholder="0,00" /></Field>
      <Field label="Ödeme yöntemi">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {paymentMethods.map((m) => <Chip key={m.value} label={m.label} active={method === m.value} onPress={() => setMethod(m.value)} />)}
        </View>
      </Field>
      <Field label="Açıklama"><Input value={description} onChangeText={setDescription} accessibilityLabel="Açıklama" /></Field>
      <Text style={s.hint}>{customer ? 'Tahsilat, müşterinin en eski açık faturasından başlayarak kapatır.' : 'Ödeme, tedarikçiye olan en eski borçtan başlayarak kapatır.'}</Text>
      <Button title="Kaydet" color={colors.green} onPress={save} loading={saving} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hint: { color: colors.muted, fontSize: 13 },
})
