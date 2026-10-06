import { useState } from 'react'
import type { AuditLogEntry } from '../api/types'
import { dateTime } from '../lib/format'
import type { Tone } from '../lib/labels'
import { useDebounce, usePage, usePaged } from '../lib/hooks'
import { useIsNewUi } from '../lib/uiMode'
import { DataTable, SearchBox, type Column } from './DataTable'
import { MobileCards } from './shell/MobileCards'
import { Badge, Select } from './ui'

const auditEntityLabel: Record<string, string> = {
  Trip: 'Sevkiyat', Invoice: 'Fatura', Payment: 'Tahsilat', Customer: 'Müşteri', Vehicle: 'Araç', Driver: 'Şoför',
  Expense: 'Gider', User: 'Kullanıcı', TripAttachment: 'Sevkiyat dosyası', CompanySettings: 'Ayarlar',
}
const actionLabel: Record<string, { text: string; tone: Tone }> = {
  Created: { text: 'Oluşturdu', tone: 'green' },
  Updated: { text: 'Değiştirdi', tone: 'blue' },
  Deleted: { text: 'Sildi', tone: 'red' },
  Reset: { text: 'Sıfırladı', tone: 'orange' },
  License: { text: 'Lisans', tone: 'blue' },
  TwoFactorEnabled: { text: '2 adımlı doğrulamayı açtı', tone: 'green' },
  TwoFactorDisabled: { text: '2 adımlı doğrulamayı kapattı', tone: 'orange' },
  LoginFailed: { text: 'Hatalı giriş', tone: 'red' },
  LoginRecovery: { text: 'Kurtarma koduyla girdi', tone: 'orange' },
  AccountLocked: { text: 'Hesap kilitlendi', tone: 'red' },
  DataExport: { text: 'Verileri indirdi', tone: 'blue' },
  CloseRequested: { text: 'Kapatma talebi', tone: 'red' },
  CloseCancelled: { text: 'Kapatma talebinden vazgeçti', tone: 'blue' },
}

/** İşlem geçmişi listesi. entityType/entityId verilirse yalnızca o kaydın geçmişi gösterilir. */
export function AuditLogTable({ entityType, entityId }: { entityType?: string; entityId?: number }) {
  const isNew = useIsNewUi()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>('')
  const debounced = useDebounce(search)
  const fixed = entityType !== undefined
  const [page, setPage] = usePage([debounced, type])
  const { data, isFetching, error, refetch } = usePaged<AuditLogEntry>('audit', {
    page, pageSize: fixed ? 50 : 30, search: debounced, entityType: fixed ? entityType : type || undefined, entityId,
  })
  const cols: Column<AuditLogEntry>[] = [
    { key: 'at', header: 'Zaman', render: (a) => dateTime(a.at) },
    { key: 'user', header: 'Kişi', render: (a) => a.userName ?? '—' },
    { key: 'action', header: 'İşlem', render: (a) => <Badge tone={actionLabel[a.action]?.tone ?? 'blue'}>{actionLabel[a.action]?.text ?? a.action}</Badge> },
    ...(fixed ? [] : [{
      key: 'entity', header: 'Kayıt', className: 'whitespace-normal! min-w-40',
      render: (a: AuditLogEntry) => <>{a.label ?? `#${a.entityId}`}<span className="block text-sm text-slate-500">{auditEntityLabel[a.entityType] ?? a.entityType}</span></>,
    }]),
    { key: 'changes', header: 'Değişiklik', className: 'whitespace-normal! min-w-60',
      render: (a) => a.changes ? <span className="text-sm">{a.changes}</span> : <span className="text-slate-500">—</span> },
  ]
  return (
    <>
      {!fixed && (
        <div className="flex flex-wrap gap-2 p-3">
          <Select aria-label="Kayıt türü" className="w-44" value={type} onChange={(v) => setType(v)} placeholder="Tüm kayıtlar"
            options={Object.entries(auditEntityLabel).map(([value, label]) => ({ value, label }))} />
          <div className="min-w-56 flex-1"><SearchBox value={search} onChange={setSearch} placeholder="Kişi, kayıt ya da değişiklik ara..." /></div>
        </div>
      )}
      <DataTable columns={cols} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(a) => a.id}
        page={page} pageSize={fixed ? 50 : 30} total={data?.total} onPage={setPage} empty="Kayıt yok."
        mobileCard={isNew ? (a) => (
          /*
           * Telefon kartı — YALNIZ yeni görünüm (`isNew`). Klasik görünümde `mobileCard` hiç verilmez;
           * tablo, süzgeç ve sayfalama davranışı değişmez (docs/plan/27-TELEFON.md §10.8).
           * Kartta satır menüsü yoktur (geçmiş kaydı salt okunur); başlık zaman, sağda kişi, tek rozet işlem.
           */
          <div className="-my-3.5">
            <MobileCards cards={[{
              id: a.id,
              title: dateTime(a.at),
              badge: { tone: actionLabel[a.action]?.tone ?? 'blue', label: actionLabel[a.action]?.text ?? a.action },
              info: [
                `${a.userName ?? '—'}${fixed ? '' : ` · ${auditEntityLabel[a.entityType] ?? a.entityType}`}`,
                fixed ? '' : (a.label ?? `#${a.entityId}`),
                a.changes ?? '—',
              ].filter(Boolean),
            }]} />
          </div>
        ) : undefined} />
    </>
  )
}
