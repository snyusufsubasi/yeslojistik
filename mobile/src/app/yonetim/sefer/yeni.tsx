import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { parseNumber } from '../../../components/ExpenseCard'
import { DateInput, Field, Input, Picker, todayIso } from '../../../components/office'
import { Button } from '../../../components/ui'
import { api } from '../../../lib/api'
import { notify } from '../../../lib/dialog'
import type { LookupItem, Trip } from '../../../lib/officeTypes'
import { colors } from '../../../lib/theme'

/**
 * Yeni sefer, düzenleme (?id=) ve kopyalama (?copy=). Telefonda sık kullanılan alanlar gösterilir; diğer alanlar
 * (dorse, taşeron faturası, iletişim kişileri...) düzenlemede korunur, ayrıntılı değişiklik web panelinden yapılır.
 */
export default function TripForm() {
  const { id, copy } = useLocalSearchParams<{ id?: string; copy?: string }>()
  const qc = useQueryClient()
  const sourceId = id ?? copy
  const source = useQuery({ queryKey: ['trip', 'office', sourceId], queryFn: () => api.get<Trip>(`/trips/${sourceId}`), enabled: !!sourceId })
  const customers = useQuery({ queryKey: ['customers', 'lookup'], queryFn: () => api.get<LookupItem[]>('/customers/lookup') })
  const vehicles = useQuery({ queryKey: ['vehicles', 'lookup'], queryFn: () => api.get<LookupItem[]>('/vehicles/lookup') })
  const drivers = useQuery({ queryKey: ['drivers', 'lookup'], queryFn: () => api.get<LookupItem[]>('/drivers/lookup') })

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  const [driverId, setDriverId] = useState<number | null>(null)
  const [loadingAddress, setLoadingAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [loadingDate, setLoadingDate] = useState<string | null>(todayIso())
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null)
  const [cargoType, setCargoType] = useState('')
  const [reference, setReference] = useState('')
  const [vehicleCost, setVehicleCost] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = source.data
    if (!t || loaded) return
    setCustomerId(t.customerId); setVehicleId(t.vehicleId); setDriverId(t.driverId)
    setLoadingAddress(t.loadingAddress); setDeliveryAddress(t.deliveryAddress)
    setCargoType(t.cargoType ?? ''); setVehicleCost(String(t.vehicleCost).replace('.', ',')); setSalePrice(String(t.salePrice).replace('.', ','))
    setDescription(t.description ?? '')
    if (id) { setLoadingDate(t.loadingDate); setDeliveryDate(t.deliveryDate ?? null); setReference(t.customerReference ?? '') }
    setLoaded(true)
  }, [source.data, loaded, id])

  const save = async () => {
    const cost = parseNumber(vehicleCost) ?? 0
    const price = parseNumber(salePrice) ?? 0
    if (!customerId || !vehicleId || !driverId) return notify('Eksik bilgi', 'Müşteri, araç ve şoförü seçin.')
    if (!loadingAddress.trim() || !deliveryAddress.trim()) return notify('Eksik bilgi', 'Yükleme ve teslimat adresini yazın.')
    if (!loadingDate) return notify('Eksik bilgi', 'Yükleme tarihini GG.AA.YYYY olarak yazın.')
    if (Number.isNaN(cost) || Number.isNaN(price) || cost < 0 || price < 0) return notify('Eksik bilgi', 'Tutarları sayı olarak girin.')
    setSaving(true)
    try {
      const base = source.data ? { ...source.data } : {}
      const body = {
        ...base, customerId, vehicleId, driverId, loadingAddress: loadingAddress.trim(), deliveryAddress: deliveryAddress.trim(),
        loadingDate, deliveryDate, description: description.trim() || null, vehicleCost: cost, salePrice: price,
        cargoType: cargoType.trim() || null, customerReference: reference.trim() || null,
        ...(id ? {} : { carrierInvoiceNo: null, carrierInvoiceDate: null }),
      }
      const saved = id ? await api.put<Trip>(`/trips/${id}`, body) : await api.post<Trip>('/trips', body)
      await qc.invalidateQueries({ queryKey: ['trips'] })
      await qc.invalidateQueries({ queryKey: ['trip', 'office'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (id) router.back()
      else router.replace({ pathname: '/yonetim/sefer/[id]', params: { id: String(saved.id) } })
    } catch (e) {
      notify('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  if (sourceId && !loaded) return <Text style={{ padding: 20, color: colors.muted }}>Yükleniyor...</Text>
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: id ? 'Sefer Düzenle' : copy ? 'Sefer Kopyala' : 'Yeni Sefer' }} />
      <Picker label="Müşteri" value={customerId} onChange={setCustomerId} options={customers.data ?? []} />
      <Picker label="Araç" value={vehicleId} onChange={setVehicleId} options={vehicles.data ?? []} />
      <Picker label="Şoför" value={driverId} onChange={setDriverId} options={drivers.data ?? []} />
      <Field label="Yükleme adresi"><Input value={loadingAddress} onChangeText={setLoadingAddress} accessibilityLabel="Yükleme adresi" placeholder="Ör. Gebze OSB" /></Field>
      <Field label="Teslimat adresi"><Input value={deliveryAddress} onChangeText={setDeliveryAddress} accessibilityLabel="Teslimat adresi" placeholder="Ör. İzmir / Kemalpaşa" /></Field>
      <DateInput label="Yükleme tarihi" value={loadingDate} onChange={setLoadingDate} />
      <DateInput label="Teslim tarihi (tahmini)" value={deliveryDate} onChange={setDeliveryDate} optional />
      <Field label="Yük cinsi"><Input value={cargoType} onChangeText={setCargoType} accessibilityLabel="Yük cinsi" /></Field>
      <Field label="Müşteri referans no"><Input value={reference} onChangeText={setReference} accessibilityLabel="Müşteri referans no" /></Field>
      <Field label="Araç maliyeti / taşerona ödenecek (TL)"><Input value={vehicleCost} onChangeText={setVehicleCost} keyboardType="decimal-pad" accessibilityLabel="Araç maliyeti" /></Field>
      <Field label="Müşteri satış fiyatı (TL)"><Input value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" accessibilityLabel="Satış fiyatı" /></Field>
      <Field label="Açıklama"><Input value={description} onChangeText={setDescription} accessibilityLabel="Açıklama" multiline /></Field>
      <Button title={id ? 'Kaydet' : 'Seferi Oluştur'} onPress={save} loading={saving} />
      <Text style={s.hint}>Şoföre bildirim gider. Dorse, iletişim kişileri ve il bilgileri araçtan / web panelinden gelir.</Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
})
