import { useState } from 'react'
import clsx from 'clsx'
import { CreditCard, KeyRound, ListChecks } from 'lucide-react'
import { post } from '../api/client'
import { Badge, Button, Card, Field, Loading } from '../components/ui'
import { useSave } from '../lib/hooks'
import { tl } from '../lib/format'
import { featureLabel, planLabel, stateLabel, stateTone, useLicense, type LicenseStatus } from '../lib/license'
import { PLANS, SUPPORT_EMAIL, SUPPORT_PHONE } from '../lib/licenseConstants'

const expiryDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Ayarlar → Abonelik (yalnızca yönetici): paket, araç kullanımı, bitiş, yenileme anahtarı ve paket karşılaştırması. */
export function LicenseTab() {
  const { data, error, refetch } = useLicense()
  if (!data) return <Loading error={error} onRetry={refetch} />
  return (
    <div className="flex flex-col gap-4">
      <StatusCard s={data} />
      <RenewCard s={data} />
      <PlansCard current={data.plan} />
    </div>
  )
}

function StatusCard({ s }: { s: LicenseStatus }) {
  const unlimited = s.vehicleLimit === 0
  const pct = unlimited ? 0 : Math.min(100, Math.round((s.vehicleCount / s.vehicleLimit) * 100))
  return (
    <Card title="Aboneliğiniz" icon={<CreditCard className="size-4" />} actions={<span data-testid="license-state"><Badge tone={stateTone[s.state]}>{stateLabel[s.state]}</Badge></span>}>
      {s.state === 'owner' && (
        <p className="text-[0.9375rem]" data-testid="license-owner">
          <b>Sahip modu:</b> bu kurulumda abonelik sınırı yok. Araç sayısı ve süre sınırsızdır.
        </p>
      )}
      {s.state === 'invalid' && <p className="text-[0.9375rem] text-bad" data-testid="license-error">{s.message}</p>}
      {s.state !== 'owner' && s.state !== 'invalid' && (
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Paket">{planLabel[s.plan ?? ''] ?? s.plan}</Item>
          <Item label="Firma">{s.customer}</Item>
          <Item label="Bitiş tarihi">
            {s.expiresAt ? expiryDate(s.expiresAt) : '—'}
            {s.daysLeft != null && (
              <span className="block text-[0.8125rem] font-normal text-muted">
                {s.daysLeft > 0 ? `${s.daysLeft} gün kaldı` : s.daysLeft === 0 ? 'Bugün bitiyor' : `${-s.daysLeft} gün önce bitti`}
              </span>
            )}
          </Item>
          <Item label="Araç">
            <span className="font-mono">{s.vehicleCount}{unlimited ? '' : ` / ${s.vehicleLimit}`}</span>
            {unlimited
              ? <span className="block text-[0.8125rem] font-normal text-muted">Sınırsız</span>
              : <span className="mt-1.5 block h-2 w-full bg-surface-2" role="progressbar" aria-label="Araç kullanımı" aria-valuenow={s.vehicleCount} aria-valuemin={0} aria-valuemax={s.vehicleLimit}>
                  <span className={clsx('block h-full', pct >= 100 ? 'bg-bad' : pct >= 80 ? 'bg-warn' : 'bg-accent')} style={{ width: `${pct}%` }} />
                </span>}
          </Item>
        </dl>
      )}
      {s.state !== 'owner' && s.state !== 'invalid' && s.features.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.8125rem]">
          <span className="text-muted">Pakete dahil:</span>
          {s.features.map((f) => <Badge key={f} tone="teal">{featureLabel[f] ?? f}</Badge>)}
        </div>
      )}
      {s.state === 'grace' && <p className="mt-4 text-[0.9375rem] text-warn">Süre bitti. Ek süre içinde her şey çalışır; yenilenmezse panel yalnızca görüntüleme yapar.</p>}
      {s.state === 'expired' && <p className="mt-4 text-[0.9375rem] text-bad">Süre bitti: kayıt eklenemez ve değiştirilemez. Verileriniz silinmez; yenileyince her şey eski haline döner.</p>}
      {s.state !== 'owner' && s.instanceId && <p className="mt-3 text-[0.8125rem] text-muted">Kurulum no: <span className="font-mono">{s.instanceId}</span></p>}
    </Card>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.75rem] font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-[1.0625rem] font-semibold text-fg">{children}</dd>
    </div>
  )
}

function RenewCard({ s }: { s: LicenseStatus }) {
  const [key, setKey] = useState('')
  const fromEnv = s.source === 'env'
  const apply = useSave((k: string) => post<LicenseStatus>('/license/apply', { key: k }), {
    invalidate: ['license', 'health'], success: 'Anahtar uygulandı.', onSuccess: () => setKey(''),
  })
  return (
    <Card title="Yenileme ve yükseltme" icon={<KeyRound className="size-4" />}>
      <p className="text-[0.9375rem]">
        Süreyi uzatmak ya da paketi yükseltmek için bize ulaşın:{' '}
        <a className="font-semibold text-accent underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {SUPPORT_PHONE}.
        Size yeni bir <b>anahtar</b> göndeririz; aşağıya yapıştırıp uygulayın. Verileriniz aynı kalır.
      </p>
      {fromEnv ? (
        <p className="mt-4 text-[0.875rem] text-muted">Bu kurulumun anahtarı sunucu ayarından geliyor; yeni anahtarı oradan değiştirmemiz gerekir.</p>
      ) : (
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (key.trim()) apply.mutate(key.trim()) }}>
          <Field label="Yeni anahtar">
            <textarea className="input h-24 font-mono text-sm" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off"
              placeholder="Size gönderilen anahtarı buraya yapıştırın" />
          </Field>
          <div><Button type="submit" loading={apply.isPending} disabled={!key.trim()}>Anahtarı uygula</Button></div>
        </form>
      )}
    </Card>
  )
}

function PlansCard({ current }: { current: string | null }) {
  return (
    <Card title="Paketler" icon={<ListChecks className="size-4" />} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[0.875rem]">
          <thead className="bg-slate-50 text-[0.75rem] font-semibold text-muted">
            <tr><th className="px-4 py-2">Paket</th><th className="px-4 py-2">Araç</th><th className="px-4 py-2 text-right">Aylık fiyat</th><th className="px-4 py-2">İçerik</th></tr>
          </thead>
          <tbody>
            {PLANS.map((p) => (
              <tr key={p.code} className={clsx('border-t border-line', p.code === current && 'bg-accent-soft')}>
                <td className="px-4 py-2 font-semibold">{p.name}{p.code === current && <span className="ml-2"><Badge tone="teal">Sizin paketiniz</Badge></span>}</td>
                <td className="px-4 py-2">{p.vehicles}</td>
                <td className="px-4 py-2 text-right font-mono">{p.monthlyTl == null ? 'Teklif' : tl(p.monthlyTl).replace(',00', '')}</td>
                <td className="px-4 py-2">{p.includes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-[0.8125rem] text-muted">KDV hariç, aylık. Yıllık ödemede 2 ay indirim. e-Fatura kontörü ayrıdır. İlk 30 gün ücretsiz deneme. Fiyatlar pilot dönemde kesinleşir.</p>
    </Card>
  )
}
