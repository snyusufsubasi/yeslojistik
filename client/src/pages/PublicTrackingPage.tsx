import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CheckCircle2, Circle, MapPin, Phone, Truck } from 'lucide-react'
import axios from 'axios'
import type { PublicTracking, TripStatus } from '../api/types'
import { Logo } from '../components/Logo'
import { MapView } from '../components/MapView'
import { Spinner } from '../components/ui'
import { ago, date } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

const steps: { status: TripStatus; label: string }[] = [
  { status: 'Planned', label: 'Sefer planlandı' },
  { status: 'Loaded', label: 'Yük araca yüklendi' },
  { status: 'OnRoad', label: 'Araç yolda' },
  { status: 'Delivered', label: 'Teslim edildi' },
]

/** Müşteriye gönderilen, giriş gerektirmeyen takip sayfası. */
export default function PublicTrackingPage() {
  const { token } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-track', token],
    // Oturum yönetimi olan api istemcisi yerine düz axios: 401 yenileme akışına girmesin.
    queryFn: async () => (await axios.get<PublicTracking>(`/api/public/track/${encodeURIComponent(token ?? '')}`)).data,
    refetchInterval: 60_000,
    retry: false,
  })
  usePageTitle('Sevkiyat Takibi')
  const current = data ? steps.findIndex((s) => s.status === data.status) : -1

  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-navy-900 px-4 py-3"><div className="mx-auto max-w-3xl"><Logo /></div></header>
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {isLoading && <Spinner />}
        {isError && (
          <div className="card p-6 text-center">
            <h1 className="mb-1 text-lg font-semibold text-navy-900">Takip linki geçersiz</h1>
            <p className="text-sm text-slate-500">Link hatalı olabilir veya süresi dolmuş olabilir. Lütfen firmamızla iletişime geçin.</p>
          </div>
        )}
        {data && (
          <>
            <div className="card p-4">
              <div className="text-[13px] text-slate-500">Sayın {data.customerTitle}</div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-navy-900">
                <Truck className="size-5 text-brand-600" /> {data.loadingAddress} → {data.deliveryAddress}
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Yükleme: {date(data.loadingDate)}{data.deliveryDate && <> · Teslim: {date(data.deliveryDate)}</>} · Araç: {data.vehiclePlate}
              </div>
            </div>
            <ol className="card space-y-3 p-4">
              {steps.map((s, i) => (
                <li key={s.status} className="flex items-center gap-3">
                  {i <= current ? <CheckCircle2 className="size-6 text-emerald-600" /> : <Circle className="size-6 text-slate-300" />}
                  <span className={clsx('text-sm', i === current ? 'font-semibold text-navy-900' : i < current ? 'text-slate-700' : 'text-slate-500')}>{s.label}</span>
                </li>
              ))}
            </ol>
            {data.latitude != null && data.longitude != null && (
              <div className="card p-2">
                <MapView className="h-80" markers={[{ id: 1, lat: data.latitude, lng: data.longitude, label: data.vehiclePlate, color: '#d97706' }]} />
                <p className="flex items-center gap-1 px-2 pt-2 text-[13px] text-slate-500"><MapPin className="size-3" /> Son konum {ago(data.lastLocationAt)} alındı</p>
              </div>
            )}
            <div className="text-center text-sm text-slate-500">
              {data.companyName}
              {data.companyPhone && <> · <a className="inline-flex items-center gap-1 text-brand-600" href={`tel:${data.companyPhone.replace(/\s/g, '')}`}><Phone className="size-3" />{data.companyPhone}</a></>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
