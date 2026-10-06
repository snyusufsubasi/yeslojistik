import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { post } from '../api/client'
import { ExportButton, TotalsStrip } from '../components/Exports'
import type { InstrumentStatus, Payment, PaymentTotals } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, DateFilter, Field, Modal, PageHeader, Select } from '../components/ui'
import { MobileCards } from '../components/shell/MobileCards'
import { useAuth } from '../lib/auth'
import { daysUntil, date, tl2, todayIso } from '../lib/format'
import { useDebounce, useListTotals, useLookup, usePaged, usePage, useSave } from '../lib/hooks'
import { instrumentStatusLabel, instrumentStatusTone, options, paymentMethodLabel } from '../lib/labels'
import { useIsNewUi } from '../lib/uiMode'

type Action = { payment: Payment; status: InstrumentStatus }

const actionLabel: Partial<Record<InstrumentStatus, string>> = {
  InCollection: 'Tahsile ver',
  Collected: 'Tahsil edildi',
  Endorsed: 'Ciro et',
  Bounced: 'Karşılıksız',
  Returned: 'İade',
  Portfolio: 'Portföye al',
}

/** Hangi durumdan hangi duruma geçilebilir (sade kural; sunucu her geçişi kabul eder). */
const nextStatuses: Record<InstrumentStatus, InstrumentStatus[]> = {
  Portfolio: ['InCollection', 'Collected', 'Endorsed', 'Bounced', 'Returned'],
  InCollection: ['Collected', 'Bounced', 'Portfolio'],
  Collected: ['Bounced'],
  Endorsed: ['Bounced', 'Portfolio'],
  Bounced: ['Portfolio', 'Returned'],
  Returned: ['Portfolio'],
}

/** Vade açıklaması: yalnız açık (portföy/tahsil) çek-senetlerde "N gün kaldı / geçti" (tablo ile aynı kural). */
function dueText(due: string | null | undefined, status: InstrumentStatus | null | undefined) {
  if (status !== 'Portfolio' && status !== 'InCollection') return ''
  const d = daysUntil(due)
  if (d === null) return ''
  return d < 0 ? ` · ${-d} gün geçti` : d === 0 ? ' · bugün' : ` · ${d} gün kaldı`
}

/** Müşteriden alınan çek ve senetler: vade takibi, tahsil, ciro ve karşılıksız işlemleri. */
export default function ChecksPage() {
  const { can } = useAuth()
  const isNew = useIsNewUi()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InstrumentStatus | ''>('Portfolio')
  const [dueTo, setDueTo] = useState('')
  const [sort, setSort] = useState({ key: 'instrumentDueDate', desc: false })
  const [action, setAction] = useState<Action | null>(null)
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced, status, dueTo])
  const query = { page, pageSize: 20, search: debounced, instruments: true, instrumentStatus: status, dueTo, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Payment>('payments', query)

  const columns: Column<Payment>[] = [
    { key: 'due', header: 'Vade', sortKey: 'instrumentDueDate', render: (p) => {
      const d = daysUntil(p.instrumentDueDate)
      const open = p.instrumentStatus === 'Portfolio' || p.instrumentStatus === 'InCollection'
      return <><span className={open && d !== null && d <= 7 ? (d < 0 ? 'font-medium text-red-600' : 'font-medium text-amber-600') : ''}>{date(p.instrumentDueDate)}</span>
        {open && d !== null && <span className="block text-sm text-slate-500">{d < 0 ? `${-d} gün geçti` : d === 0 ? 'bugün' : `${d} gün kaldı`}</span>}</>
    } },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', render: (p) => <>{p.customerTitle}<span className="block text-sm text-slate-500">Alış: {date(p.date)}</span></> },
    { key: 'no', header: 'Çek / Senet', render: (p) => <>{paymentMethodLabel[p.method]} {p.instrumentNo ?? ''}{p.bank && <span className="block text-sm text-slate-500">{p.bank}</span>}</> },
    { key: 'status', header: 'Durum', render: (p) => p.instrumentStatus && <>
      <Badge tone={instrumentStatusTone[p.instrumentStatus]}>{instrumentStatusLabel[p.instrumentStatus]}</Badge>
      {p.endorsedTo && <span className="mt-0.5 block text-sm text-slate-500">→ {p.endorsedTo}</span>}
      {p.cashAccountName && p.instrumentStatus === 'Collected' && <span className="mt-0.5 block text-sm text-slate-500">{p.cashAccountName}</span>}
    </> },
    { key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (p) => <span className="font-medium">{tl2(p.amount)}</span> },
  ]
  if (can('accounting')) columns.push({
    key: 'actions', header: '', align: 'right', render: (p) => p.instrumentStatus && (
      <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {nextStatuses[p.instrumentStatus].map((s) => (
          <Button key={s} size="sm" variant={s === 'Bounced' ? 'danger' : 'secondary'} onClick={() => setAction({ payment: p, status: s })}>{actionLabel[s]}</Button>
        ))}
      </div>
    ),
  })
  const { data: totals } = useListTotals<PaymentTotals>('payments', query)

  return (
    <>
      <PageHeader title="Çek / Senet" subtitle="Müşteriden alınan çek ve senetlerin vade ve durum takibi"
        actions={<ExportButton url="/payments/export" params={query} fileName="cek-senet.xlsx" />} />
      <p className="mb-3 text-sm text-slate-600">Yeni çek/senet, Tahsilatlar'da ödeme yöntemi “Çek” ya da “Senet” seçilerek girilir. Karşılıksız ya da iade edilen çek müşterinin bakiyesinden düşmez.</p>
      <Card title="Portföy" icon={<ScrollText className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, açıklama..." />}>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-6 py-4 md:grid-cols-4">
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(instrumentStatusLabel)} placeholder="Tüm durumlar" />
          <DateFilter label="Vadesi şu tarihe kadar" value={dueTo} onChange={setDueTo} />
        </div>
        {totals && totals.count > 0 && <TotalsStrip items={[
          { label: 'Çek / senet', value: totals.count },
          { label: 'Toplam', value: tl2(totals.total) },
        ]} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(p) => p.id}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage}
          empty={status === 'Portfolio' ? 'Portföyde çek/senet yok.' : 'Kayıt yok.'}
          mobileCard={isNew ? (p) => (
            /* Telefon kartı — yalnız yeni görünüm. Klasik görünümde `mobileCard` verilmez (tablo aynı kalır). */
            <div className="-my-3.5">
              <MobileCards menuLabel={`${paymentMethodLabel[p.method]} ${p.instrumentNo ?? p.customerTitle} işlemleri`} cards={[{
                id: p.id,
                title: p.customerTitle,
                badge: p.instrumentStatus ? { tone: instrumentStatusTone[p.instrumentStatus], label: instrumentStatusLabel[p.instrumentStatus] } : undefined,
                info: [
                  `Vade ${date(p.instrumentDueDate)}${dueText(p.instrumentDueDate, p.instrumentStatus)}`,
                  `${paymentMethodLabel[p.method]}${p.instrumentNo ? ` ${p.instrumentNo}` : ''}${p.bank ? ` · ${p.bank}` : ''}`,
                  p.endorsedTo ? `Ciro: ${p.endorsedTo}` : `Alış ${date(p.date)}`,
                ],
                amount: tl2(p.amount),
                onOpen: can('accounting') && p.instrumentStatus ? () => setAction({ payment: p, status: nextStatuses[p.instrumentStatus as InstrumentStatus][0] }) : undefined,
                menu: p.instrumentStatus ? nextStatuses[p.instrumentStatus].map((s) => ({ label: actionLabel[s] ?? s, danger: s === 'Bounced', write: true, perm: 'accounting', onClick: () => setAction({ payment: p, status: s }) })) : undefined,
              }]} />
            </div>
          ) : undefined} />
      </Card>
      {action && <InstrumentActionDialog action={action} onClose={() => setAction(null)} />}
    </>
  )
}

function InstrumentActionDialog({ action, onClose }: { action: Action; onClose: () => void }) {
  const { payment, status } = action
  const suppliers = useLookup('suppliers')
  const accounts = useLookup('cash-accounts')
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [accountId, setAccountId] = useState<number | null>(payment.cashAccountId ?? null)
  const [when, setWhen] = useState(todayIso())
  const save = useSave(() => post(`/payments/${payment.id}/instrument`, { status, supplierId, cashAccountId: accountId, date: when }), {
    invalidate: ['payments', 'customers', 'suppliers', 'supplier-payments', 'cash-accounts', 'invoices'],
    success: `${paymentMethodLabel[payment.method]} “${instrumentStatusLabel[status]}” olarak işaretlendi.`, onSuccess: onClose,
  })
  const needsSupplier = status === 'Endorsed'
  return (
    <Modal open onClose={onClose} title={`${actionLabel[status]}: ${paymentMethodLabel[payment.method]} ${payment.instrumentNo ?? ''}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button variant={status === 'Bounced' ? 'danger' : 'primary'} loading={save.isPending} disabled={needsSupplier && !supplierId} onClick={() => save.mutate(undefined)}>
          {actionLabel[status]}</Button></>}>
      <div className="grid gap-3 text-sm">
        <p className="text-slate-600">{payment.customerTitle} · {tl2(payment.amount)} · vade {date(payment.instrumentDueDate)}</p>
        {status === 'Bounced' && <p className="rounded-md bg-red-50 p-2 text-red-700">Tutar müşterinin bakiyesine geri eklenir.{payment.instrumentStatus === 'Endorsed' && ' Ciro edildiği tedarikçiye yapılan ödeme de geri alınır (borç yeniden açılır).'}</p>}
        {status === 'Returned' && <p className="text-slate-600">Çek/senet müşteriye geri verildi; tutar müşterinin bakiyesine geri eklenir.</p>}
        {needsSupplier && <>
          <Field label="Ciro edilen tedarikçi" required>
            <PlainSelect value={supplierId} onChange={setSupplierId} placeholder="Tedarikçi seçin"
              options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))} />
          </Field>
          <Field label="Ciro tarihi"><input className="input" type="date" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <p className="text-slate-600">Tedarikçiye aynı tutarda ödeme yazılır, borcu düşer.</p>
        </>}
        {(status === 'Collected' || status === 'InCollection') && (accounts.data?.length ?? 0) > 0 && (
          <Field label="Banka / kasa hesabı" hint={status === 'Collected' ? 'Tahsil edilen tutar bu hesaba girer.' : 'Tahsile verildiği banka.'}>
            <PlainSelect value={accountId} onChange={setAccountId} placeholder="— Seçilmedi —"
              options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.label }))} />
          </Field>
        )}
      </div>
    </Modal>
  )
}

function PlainSelect({ value, onChange, options, placeholder }: { value: number | null; onChange: (v: number | null) => void; options: { value: number; label: string }[]; placeholder: string }) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
