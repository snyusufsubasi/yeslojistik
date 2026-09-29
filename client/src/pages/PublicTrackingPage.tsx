import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CheckCircle2, Circle, MapPin, Phone, Truck } from 'lucide-react'
import axios from 'axios'
import type { PublicTracking, TripStatus } from '../api/types'
import { Logo } from '../components/Logo'
import { MapView } from '../components/MapView'
import { Spinner } from '../components/ui'
import { ago, date, dateTime } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

const headline: Record<TripStatus, { text: string; tone: string }> = {
  Planned: { text: 'Seferiniz planlandı', tone: 'bg-slate-700' },
  Loaded: { text: 'Yükünüz araca yüklendi', tone: 'bg-brand-600' },
  OnRoad: { text: 'Yükünüz yolda', tone: 'bg-brand-600' },
  Delivered: { text: 'Yükünüz teslim edildi', tone: 'bg-emerald-600' },
  Cancelled: { text: 'Bu sefer iptal edildi', tone: 'bg-red-600' },
}

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
  const eventAt = (status: TripStatus) => data?.events?.find((e) => e.status === status)?.occurredAt

  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-navy-900 px-4 py-3"><div className="mx-auto max-w-3xl"><Logo /></div></header>
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {isLoading && <Spinner />}
        {isError && (
          <div className="card p-6 text-center">
            <h1 className="mb-2 text-xl font-medium text-navy-900">Takip linki geçersiz</h1>
            <p className="text-[0.9375rem] text-slate-600">Link hatalı olabilir veya süresi dolmuş olabilir. Lütfen firmamızla iletişime geçin.</p>
          </div>
        )}
        {data && (
          <>
            <div className={clsx('rounded-xl p-5 text-white shadow-sm', headline[data.status].tone)}>
              <div className="text-sm opacity-90">Sayın {data.customerTitle}</div>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                <Truck className="size-7 shrink-0" /> {headline[data.status].text}
              </h1>
            </div>
            <dl className="card grid gap-4 p-5 text-[0.9375rem] sm:grid-cols-2">
              <div><dt className="text-sm text-slate-600">Nereden</dt><dd className="font-medium text-navy-900">{data.loadingAddress}</dd></div>
              <div><dt className="text-sm text-slate-600">Nereye</dt><dd className="font-medium text-navy-900">{data.deliveryAddress}</dd></div>
              <div><dt className="text-sm text-slate-600">Yükleme tarihi</dt><dd className="text-slate-800">{date(data.loadingDate)}</dd></div>
              <div><dt className="text-sm text-slate-600">{data.status === 'Delivered' ? 'Teslim tarihi' : 'Tahmini teslim'}</dt><dd className="text-slate-800">{data.deliveryDate ? date(data.deliveryDate) : '—'}</dd></div>
              <div><dt className="text-sm text-slate-600">Araç plakası</dt><dd className="text-slate-800">{data.vehiclePlate}</dd></div>
              {data.customerReference && <div><dt className="text-sm text-slate-600">Sipariş / referans no</dt><dd className="text-slate-800">{data.customerReference}</dd></div>}
            </dl>
            {data.status !== 'Cancelled' && <ol className="card space-y-4 p-5" aria-label="Sevkiyat aşamaları">
              {steps.map((s, i) => (
                <li key={s.status} className="flex items-center gap-3">
                  {i <= current ? <CheckCircle2 className="size-7 shrink-0 text-emerald-600" /> : <Circle className="size-7 shrink-0 text-slate-500" />}
                  <span className={clsx('text-[0.9375rem]', i === current ? 'font-medium text-navy-900' : i < current ? 'text-slate-700' : 'text-slate-500')}>
                    {s.label}{i === current && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700">şu an</span>}
                    {i <= current && eventAt(s.status) && <span className="block text-sm font-normal text-slate-500">{dateTime(eventAt(s.status)!)}</span>}
                  </span>
                </li>
              ))}
            </ol>}
            {data.latitude != null && data.longitude != null && (
              <div className="card p-2">
                <MapView className="h-80" markers={[{ id: 1, lat: data.latitude, lng: data.longitude, label: data.vehiclePlate, color: '#d97706' }]} />
                <p className="flex items-center gap-1.5 px-2 pt-2 text-sm text-slate-600"><MapPin className="size-4" /> Aracın son konumu, {ago(data.lastLocationAt)} alındı</p>
              </div>
            )}
            <div className="card flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <div className="text-sm text-slate-600">Sorunuz mu var?</div>
                <div className="text-[0.9375rem] font-medium text-navy-900">{data.companyName}</div>
              </div>
              {data.companyPhone && (
                <a className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-[0.9375rem] font-medium text-white hover:bg-brand-700" href={`tel:${data.companyPhone.replace(/\s/g, '')}`}>
                  <Phone className="size-5" /> Bizi arayın: {data.companyPhone}
                </a>
              )}
            </div>
            <p className="text-center text-sm text-slate-600">Bu sayfa her dakika kendiliğinden yenilenir.</p>
          </>
        )}
      </main>
    </div>
  )
}
