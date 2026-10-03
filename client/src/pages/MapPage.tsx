import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { MapPin, Navigation } from 'lucide-react'
import { get } from '../api/client'
import type { RoutePoint, VehicleLocation } from '../api/types'
import { MapView, type MapMarker } from '../components/MapView'
import { Badge, Card, Empty, PageHeader, PlateBadge } from '../components/ui'
import { ago, dateTime } from '../lib/format'
import { vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'

const statusColor = { OnRoad: '#d97706', Available: '#059669', Maintenance: '#dc2626' } as const

export default function MapPage() {
  const [selected, setSelected] = useState<number | null>(null)
  const { data } = useQuery({ queryKey: ['tracking'], queryFn: () => get<VehicleLocation[]>('/tracking/vehicles'), refetchInterval: 30_000 })
  const sel = data?.find((v) => v.vehicleId === selected)
  const route = useQuery({
    queryKey: ['tracking', 'route', sel?.activeTripId],
    queryFn: () => get<RoutePoint[]>(`/trips/${sel!.activeTripId}/route`),
    enabled: !!sel?.activeTripId,
    refetchInterval: 30_000,
  })

  const located = data?.filter((v) => v.latitude != null && v.longitude != null) ?? []
  const markers: MapMarker[] = located.map((v) => ({
    id: v.vehicleId, lat: v.latitude!, lng: v.longitude!, label: v.plate, color: statusColor[v.status],
    onClick: () => setSelected(v.vehicleId),
    popup: (
      <div className="text-sm">
        <div className="font-medium">{v.plate} · {v.type}</div>
        {v.driverName && <div>Şoför: {v.driverName}</div>}
        {v.activeTripLabel && <div>{v.activeTripLabel}</div>}
        <div className="text-slate-500">Son konum: {dateTime(v.lastLocationAt)}{v.speedKmh != null && ` · ${Math.round(v.speedKmh)} km/s`}</div>
      </div>
    ),
  }))
  const routeLine = route.data?.map((p) => [p.latitude, p.longitude] as [number, number])
  const fitTo = sel?.latitude != null ? [...(routeLine ?? []), [sel.latitude, sel.longitude!] as [number, number]] : undefined

  return (
    <>
      <PageHeader title="Araç Takip Haritası" subtitle="Şoför uygulamasından gelen son konumlar · 30 saniyede bir yenilenir" />
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-3" bodyClassName="p-2">
          <MapView markers={markers} route={sel ? routeLine : undefined} fitTo={fitTo} className="h-[60vh] min-h-80" />
        </Card>
        <Card title="Araçlar" icon={<Navigation className="size-4" />} bodyClassName="p-0">
          {data?.length === 0 && <Empty>Araç yok.</Empty>}
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {data?.map((v) => (
              <li key={v.vehicleId}>
                <button onClick={() => setSelected(v.vehicleId === selected ? null : v.vehicleId)}
                  className={clsx('w-full border-l-[3px] px-4 py-2.5 text-left hover:bg-surface-2', v.vehicleId === selected ? 'border-accent bg-accent-soft' : 'border-transparent')}>
                  <div className="flex items-center justify-between gap-2">
                    <PlateBadge plate={v.plate} />
                    <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge>
                  </div>
                  {v.activeTripLabel && <div className="truncate text-sm text-slate-600">{v.activeTripLabel}</div>}
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="size-3" />
                    {v.lastLocationAt ? <>{ago(v.lastLocationAt)}{v.speedKmh != null && v.speedKmh > 0 && ` · ${Math.round(v.speedKmh)} km/s`}</> : 'Konum bilgisi yok'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
