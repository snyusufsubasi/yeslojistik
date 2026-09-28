import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapMarker {
  id: string | number
  lat: number
  lng: number
  label: string
  color?: string
  popup?: React.ReactNode
  onClick?: () => void
}

// Türkiye'nin ortası
const TR_CENTER: [number, number] = [39.0, 35.0]

function markerIcon(label: string, color: string) {
  const safe = label.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
      <div style="background:${color};color:#fff;font:600 11px Inter,sans-serif;padding:3px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35);border:2px solid #fff">${safe}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${color};margin-top:-1px"></div>
    </div>`,
  })
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 11)
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 })
    // key değişince yeniden sığdır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

export function MapView({ markers, route, className = 'h-96', fitTo }:
  { markers: MapMarker[]; route?: [number, number][]; className?: string; fitTo?: [number, number][] }) {
  const fit = fitTo ?? [...markers.map((m) => [m.lat, m.lng] as [number, number]), ...(route ?? [])]
  return (
    <div className={`${className} relative z-0 overflow-hidden rounded-lg border border-slate-200`}>
      <MapContainer center={TR_CENTER} zoom={6} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {route && route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#1570cd', weight: 4, opacity: 0.8 }} />}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon(m.label, m.color ?? '#0b2a55')}
            eventHandlers={m.onClick ? { click: m.onClick } : undefined}>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
        <FitBounds points={fit} />
      </MapContainer>
    </div>
  )
}
