import { useMemo } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { VehicleLocation } from '../lib/officeTypes'

/** OpenStreetMap + Leaflet (ücretsiz, anahtar gerekmez). Araç işaretine dokununca onSelect çağrılır. */
export function VehicleMap({ vehicles, onSelect }: { vehicles: VehicleLocation[]; onSelect: (id: number) => void }) {
  const points = vehicles.filter((v) => v.latitude != null && v.longitude != null)
    .map((v) => ({ id: v.vehicleId, lat: v.latitude, lng: v.longitude, label: v.plate, onRoad: v.status === 'OnRoad' }))
  const html = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%}.lbl{background:#0b2a55;color:#fff;border-radius:6px;padding:2px 6px;font:600 12px sans-serif;white-space:nowrap}.lbl.on{background:#d97706}</style>
</head><body><div id="m"></div><script>
var m=L.map('m',{zoomControl:true}).setView([39.0,35.0],6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(m);
var pts=${JSON.stringify(points)};var b=[];
pts.forEach(function(p){var i=L.divIcon({className:'',html:'<div class="lbl'+(p.onRoad?' on':'')+'">'+p.label+'</div>'});
L.marker([p.lat,p.lng],{icon:i}).addTo(m).on('click',function(){window.ReactNativeWebView.postMessage(String(p.id))});b.push([p.lat,p.lng]);});
if(b.length)m.fitBounds(b,{padding:[40,40],maxZoom:11});
</script></body></html>`, [JSON.stringify(points)])
  return (
    <View style={{ height: 360 }}>
      <WebView originWhitelist={['*']} source={{ html }} onMessage={(e) => onSelect(Number(e.nativeEvent.data))} />
    </View>
  )
}
