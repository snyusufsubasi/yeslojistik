import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, FileText, Link2, MessageCircle, Trash2, Upload } from 'lucide-react'
import { api, del, errorMessage, get, post } from '../api/client'
import type { Attachment, AttachmentKind, RoutePoint, TrackingLink, Trip } from '../api/types'
import { dateTime, fileSize } from '../lib/format'
import { attachmentKindLabel, tripStatusLabel } from '../lib/labels'
import { MapView } from './MapView'
import { useToast } from './Toast'
import { Button, ConfirmDialog, Empty, IconButton, Select, Spinner } from './ui'
import { compressImage } from '../lib/image'

export function TripAttachments({ trip }: { trip: Trip }) {
  const qc = useQueryClient()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<AttachmentKind>('Document')
  const [note, setNote] = useState('')
  const [deleting, setDeleting] = useState<Attachment | null>(null)
  const key = ['trips', 'attachments', trip.id]
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => get<Attachment[]>(`/trips/${trip.id}/attachments`) })

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', await compressImage(file))
        form.append('kind', kind)
        if (note) form.append('note', note)
        await api.post(`/trips/${trip.id}/attachments`, form)
      }
    },
    onSuccess: () => { toast.success('Dosya yüklendi.'); setNote(''); qc.invalidateQueries({ queryKey: key }) },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => { if (input.current) input.current.value = '' },
  })
  const remove = useMutation({
    mutationFn: (id: number) => del(`/attachments/${id}`),
    onSuccess: () => { toast.success('Dosya silindi.'); setDeleting(null); qc.invalidateQueries({ queryKey: key }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
        <label className="w-40"><span className="label">Tür</span>
          <Select value={kind} onChange={(v) => v && setKind(v)} options={Object.entries(attachmentKindLabel).map(([value, label]) => ({ value: value as AttachmentKind, label }))} />
        </label>
        <label className="min-w-40 flex-1"><span className="label">Not</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ör. İmzalı irsaliye" />
        </label>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" aria-label="Dosya seç"
          onChange={(e) => e.target.files?.length && upload.mutate(e.target.files)} />
        <Button icon={<Upload className="size-4" />} loading={upload.isPending} onClick={() => input.current?.click()}>Dosya Yükle</Button>
      </div>
      <p className="text-sm text-slate-500">JPEG, PNG, WEBP veya PDF · en fazla 10 MB. Şoförler teslim fotoğraflarını mobil uygulamadan yükler.</p>
      {isLoading ? <Spinner /> : !data?.length ? <Empty>Bu sefere eklenmiş dosya yok.</Empty> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-lg border border-slate-200 p-2">
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                {a.contentType.startsWith('image/')
                  ? <img src={`/api/attachments/${a.id}`} alt={a.fileName} className="size-16 rounded object-cover" loading="lazy" />
                  : <div className="flex size-16 items-center justify-center rounded bg-slate-100 text-slate-500"><FileText className="size-7" /></div>}
              </a>
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate font-medium" title={a.fileName}>{a.fileName}</div>
                <div className="text-sm text-slate-500">{attachmentKindLabel[a.kind]} · {fileSize(a.size)}</div>
                {a.note && <div className="truncate text-sm text-slate-600">{a.note}</div>}
                <div className="text-sm text-slate-500">{dateTime(a.createdAt)}{a.uploadedBy && ` · ${a.uploadedBy}`}</div>
              </div>
              <div className="flex flex-col">
                <a href={`/api/attachments/${a.id}?download=true`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="İndir" aria-label="İndir">
                  <ExternalLink className="size-4" />
                </a>
                <IconButton label="Sil" onClick={() => setDeleting(a)}><Trash2 className="size-4" /></IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!deleting} title="Dosyayı sil" message={<>{deleting?.fileName} silinecek.</>} confirmText="Sil"
        loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} />
    </div>
  )
}

export function TripTracking({ trip }: { trip: Trip }) {
  const toast = useToast()
  const [link, setLink] = useState<TrackingLink | null>(null)
  const route = useQuery({ queryKey: ['trips', 'route', trip.id], queryFn: () => get<RoutePoint[]>(`/trips/${trip.id}/route`) })
  const create = useMutation({
    mutationFn: () => post<TrackingLink>(`/trips/${trip.id}/tracking-link`),
    onSuccess: setLink,
    onError: (e) => toast.error(errorMessage(e)),
  })
  const message = link && `Merhaba, ${trip.loadingAddress} → ${trip.deliveryAddress} sevkiyatınızı buradan takip edebilirsiniz: ${link.url}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(link!.url); toast.success('Link kopyalandı.') } catch { toast.error('Kopyalanamadı, linki elle seçin.') }
  }
  const points = route.data?.map((p) => [p.latitude, p.longitude] as [number, number]) ?? []
  const last = points.at(-1)

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-3">
        <div className="mb-2 text-sm font-medium text-navy-900">Müşteri takip linki</div>
        <p className="mb-3 text-sm text-slate-500">
          Müşteri bu linkle seferin durumunu ve araç yoldayken konumunu görür. Fiyat ve şoför bilgisi paylaşılmaz.
          Link teslimden 7 gün sonra kapanır.
        </p>
        {trip.status === 'Cancelled' ? <p className="text-sm text-slate-500">İptal edilmiş sefer için link oluşturulamaz.</p> : !link ? (
          <Button icon={<Link2 className="size-4" />} loading={create.isPending} onClick={() => create.mutate()}>Takip Linki Oluştur</Button>
        ) : (
          <div className="space-y-2">
            <input className="input font-mono text-sm" readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Takip linki" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<Copy className="size-3.5" />} onClick={copy}>Kopyala</Button>
              <a className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                href={`https://wa.me/?text=${encodeURIComponent(message!)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-3.5" /> WhatsApp ile Gönder
              </a>
              <a className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Önizle</a>
            </div>
          </div>
        )}
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-navy-900">Sefer rotası</div>
        {route.isLoading ? <Spinner /> : points.length === 0 ? (
          <Empty>Bu sefer için henüz konum kaydı yok. Şoför mobil uygulamada sefere başladığında rota burada görünür.</Empty>
        ) : (
          <>
            <MapView className="h-72" route={points} markers={last ? [{ id: 'last', lat: last[0], lng: last[1], label: `${trip.vehiclePlate} · ${tripStatusLabel[trip.status]}`, color: '#d97706' }] : []} />
            <p className="mt-1 text-sm text-slate-500">{points.length} konum · son kayıt {dateTime(route.data!.at(-1)!.recordedAt)}</p>
          </>
        )}
      </div>
    </div>
  )
}
