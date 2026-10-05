import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { get } from '../api/client'
import type { UetdsIssue, UetdsReadiness } from '../api/types'
import type { UetdsForm } from '../lib/tripUetds'
import { Badge, Field } from './ui'

const targetLink: Record<Exclude<UetdsIssue['target'], 'Trip'>, { to: (id: number) => string; label: string }> = {
  Driver: { to: (id) => `/soforler?id=${id}`, label: 'Şoförü düzenle' },
  Vehicle: { to: (id) => `/araclar?id=${id}`, label: 'Aracı düzenle' },
  Customer: { to: (id) => `/musteriler/${id}`, label: 'Müşteriyi aç' },
}

/**
 * "U-ETDS hazırlığı": bu sefer için bildirimde istenen bilgiler tam mı? ✓ Hazır ya da N eksik, eksiklerin listesi ve düzeltme bağlantıları.
 * Bu yalnızca bir kontroldür; Bakanlığa HİÇBİR ŞEY gönderilmez (bkz. docs/UETDS.md).
 * Şoför / araç / müşteri düzeltmeleri yeni sekmede açılır; sekmeye dönünce kontrol kendiliğinden yenilenir.
 */
export function UetdsPanel({ tripId, onFixTrip }: { tripId: number; onFixTrip: (field: string) => void }) {
  const q = useQuery({ queryKey: ['trips', 'uetds', tripId], queryFn: () => get<UetdsReadiness>(`/trips/${tripId}/uetds-readiness`) })
  const data = q.data
  const missing = data?.issues.filter((i) => i.blocking) ?? []
  const notes = data?.issues.filter((i) => !i.blocking) ?? []
  return (
    <section aria-label="U-ETDS hazırlığı" className="mb-4 rounded-md border border-line bg-surface-2/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-navy-900">U-ETDS hazırlığı</h3>
        {q.isLoading && <span className="text-sm text-muted">Kontrol ediliyor…</span>}
        {q.isError && <span className="text-sm text-bad">Kontrol edilemedi.</span>}
        {data && (data.ready
          ? <Badge tone="green"><CheckCircle2 className="size-3" />Hazır</Badge>
          : <Badge tone="yellow">{data.missingCount} eksik</Badge>)}
        <span className="ml-auto text-[0.8125rem] text-muted">Hazırlık kontrolüdür; Bakanlığa bildirim göndermez.</span>
      </div>
      {missing.length > 0 && (
        <ul className="mt-2 space-y-1">
          {missing.map((i) => <IssueRow key={i.code} issue={i} onFixTrip={onFixTrip} />)}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2" aria-label="Kontrol edin">
          {notes.map((i) => <IssueRow key={i.code} issue={i} onFixTrip={onFixTrip} note />)}
        </ul>
      )}
      {data && !data.ready && <p className="mt-2 text-[0.8125rem] text-muted">Sevkiyat alanlarını düzeltip Kaydet deyin; şoför, araç ve müşteri düzeltmeleri yeni sekmede açılır.</p>}
    </section>
  )
}

function IssueRow({ issue, onFixTrip, note }: { issue: UetdsIssue; onFixTrip: (field: string) => void; note?: boolean }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 text-sm text-slate-700">
      <span aria-hidden className={note ? 'text-muted' : 'text-warn'}>{note ? 'i' : '•'}</span>
      <span className="min-w-0 flex-1">{issue.message}</span>
      {issue.target === 'Trip'
        ? issue.field && <button type="button" className="text-brand-700 underline underline-offset-2" onClick={() => onFixTrip(issue.field!)}>Alana git</button>
        : issue.targetId != null && (
          <a className="inline-flex items-center gap-1 text-brand-700 underline underline-offset-2" href={targetLink[issue.target].to(issue.targetId)} target="_blank" rel="noopener noreferrer">
            {targetLink[issue.target].label}<ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
    </li>
  )
}

/** Sefer formunun "Ayrıntılar" bölümündeki U-ETDS alanları (ilçeler, yükleme saati, alıcı). */
export function UetdsFields({ register, errors }: { register: UseFormRegister<{ uetds: UetdsForm }>; errors: FieldErrors<UetdsForm> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Yükleme İlçesi" error={errors.loadingDistrict?.message}><input className="input" placeholder="Tuzla" {...register('uetds.loadingDistrict')} /></Field>
      <Field label="Teslim İlçesi" error={errors.deliveryDistrict?.message}><input className="input" placeholder="Bornova" {...register('uetds.deliveryDistrict')} /></Field>
      <Field label="Yükleme Saati" error={errors.loadingTime?.message}><input className="input tabular-nums md:max-w-40" type="time" {...register('uetds.loadingTime')} /></Field>
      <Field className="md:col-span-2" label="Alıcı Unvanı / Adı Soyadı" error={errors.consigneeTitle?.message} hint="Gönderici, seçilen müşteridir.">
        <input className="input" placeholder="Alıcı Ticaret A.Ş." {...register('uetds.consigneeTitle')} />
      </Field>
      <Field label="Alıcı VKN / TCKN" error={errors.consigneeTaxNumber?.message}>
        <input className="input tabular-nums" inputMode="numeric" maxLength={11} {...register('uetds.consigneeTaxNumber')} />
      </Field>
    </div>
  )
}
