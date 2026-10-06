import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowLeftRight, FileSpreadsheet, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { del, get, post, put } from '../api/client'
import type { CashAccount, CashAccountKind, CashMovement, CashTransfer } from '../api/types'
import { ImportButton, useImportAction } from '../components/ImportDialog'
import { Badge, Button, Card, Chip, ConfirmDialog, Empty, Field, IconButton, Modal, Spinner } from '../components/ui'
import { SearchBox } from '../components/DataTable'
import { SumStrip } from '../components/SumStrip'
import type { MenuItem } from '../components/shell/Menu'
import { PageShell } from '../components/shell/PageShell'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { date, tl2, todayIso } from '../lib/format'
import { useSave } from '../lib/hooks'
import { cashAccountKindLabel } from '../lib/labels'
import { useIsNewUi } from '../lib/uiMode'
import { ControlledChoice, ControlledToggle } from '../components/Choice'
import { AmountInput, DateQuick } from '../components/Inputs'
import { choices } from '../lib/choices'
import { cashAccountKindIcon } from '../lib/icons'

const accountSchema = z.object({
  name: req('Hesap adı zorunlu.'),
  kind: z.enum(['Cash', 'Bank', 'Pos', 'CreditCard']),
  iban: optStr,
  openingBalance: z.number({ error: 'Tutar girin (yoksa 0).' }),
  openingBalanceDate: optStr,
  isActive: z.boolean(),
})
type AccountValues = z.infer<typeof accountSchema>

/**
 * Kasa, banka, POS ve kredi kartı hesapları; bakiye tahsilat, ödeme, gider ve virmanlardan hesaplanır.
 * Şartname: docs/plan/11-BANKALAR.md. Yeni görünümde `PageShell` + `SumStrip` (TOPLAM · KASA · BANKA · KREDİ KARTI)
 * ve hesap araması kullanılır; klasik görünüm bugünkü düzeni aynen korur.
 */
export default function CashAccountsPage() {
  const isNew = useIsNewUi()
  const accounts = useQuery({ queryKey: ['cash-accounts'], queryFn: () => get<CashAccount[]>('/cash-accounts') })
  const [editing, setEditing] = useState<CashAccount | 'new' | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [transfer, setTransfer] = useState(false)
  const [search, setSearch] = useState('')
  const [showPassive, setShowPassive] = useState(false)
  const imp = useImportAction('cash-accounts')
  const list = accounts.data ?? []
  // Yeni görünümde pasif hesaplar varsayılan gizli ve liste arama ile süzülür; klasik görünüm tam listeyi gösterir (11-BANKALAR §3a).
  const term = search.trim().toLocaleLowerCase('tr')
  const visible = isNew
    ? list.filter((a) => (showPassive || a.isActive) && (!term
      || a.name.toLocaleLowerCase('tr').includes(term)
      || (a.iban ?? '').toLocaleLowerCase('tr').includes(term)))
    : list
  const current = visible.find((a) => a.id === selected) ?? visible[0]
  const total = list.filter((a) => a.isActive && a.kind !== 'CreditCard').reduce((s, a) => s + a.balance, 0)
  const kindSum = (kinds: CashAccountKind[]) => list.filter((a) => a.isActive && kinds.includes(a.kind)).reduce((s, a) => s + a.balance, 0)
  const cardDebt = list.filter((a) => a.kind === 'CreditCard').reduce((s, a) => s + a.balance, 0)
  const activeCount = list.filter((a) => a.isActive).length

  // Yeni görünümde nadir işler "⋯ Diğer" menüsüne taşınır; Virman yalnız iki aktif hesap varsa görünür (11-BANKALAR §10.4).
  const more: MenuItem[] = [
    { label: "Excel'den Aktar", icon: <FileSpreadsheet className="size-4" />, write: true, onClick: imp.run },
    ...(activeCount >= 2 ? [{ label: 'Virman', icon: <ArrowLeftRight className="size-4" />, write: true, onClick: () => setTransfer(true) }] : []),
  ]

  return (
    <>
      <PageShell title="Kasa / Banka" subtitle={<>Hesap bakiyeleri. Toplam nakit ve banka: <b>{tl2(total)}</b></>}
        more={more} primary={<Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Hesap Ekle</Button>}
        actions={<>
          <ImportButton entity="cash-accounts" />
          <Button variant="secondary" icon={<ArrowLeftRight className="size-4" />} disabled={list.length < 2} onClick={() => setTransfer(true)}>Virman</Button>
          <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Hesap Ekle</Button>
        </>}>
      {isNew && (
        <SumStrip label="Kasa ve banka toplamları" items={[
          { label: 'Toplam', value: tl2(total) },
          { label: 'Kasa', value: tl2(kindSum(['Cash'])) },
          { label: 'Banka', value: tl2(kindSum(['Bank', 'Pos'])) },
          { label: 'Kredi kartı (borç)', value: tl2(cardDebt), tone: cardDebt < 0 ? 'text-bad' : undefined },
        ]} />
      )}
      <p className="mb-3 mt-3 text-sm text-slate-600">Tahsilat, taşeron ödemesi, gider ve şoför ödemesi girerken “Kasa / Banka” seçerseniz bakiye burada kendiliğinden hesaplanır. Çek/senet yalnızca tahsil edilince hesaba girer.</p>
      {isNew && (
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <div className="min-w-56 flex-1 sm:max-w-md"><SearchBox value={search} onChange={setSearch} placeholder="Hesap adı, IBAN..." /></div>
          <Chip active={showPassive} onClick={() => setShowPassive((v) => !v)}>Pasifleri göster</Chip>
        </div>
      )}
      {accounts.isLoading ? <Spinner /> : list.length === 0 ? (
        <Card><Empty>Henüz hesap yok. “Hesap Ekle” ile kasa ve banka hesaplarınızı açılış bakiyeleriyle girin.</Empty></Card>
      ) : visible.length === 0 ? (
        <Card><Empty action={<Button variant="secondary" onClick={() => { setSearch(''); setShowPassive(true) }}>Süzgeci temizle</Button>}>
          Aramanıza uyan hesap yok.
        </Empty></Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            {visible.map((a) => (
              <button key={a.id} onClick={() => setSelected(a.id)} aria-current={current?.id === a.id ? 'true' : undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${current?.id === a.id ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy-900">{a.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                    <span>{cashAccountKindLabel[a.kind]}{!a.isActive && ' · pasif'}</span>
                    {isNew && a.balance < 0 && <Badge tone="red">Eksi bakiye</Badge>}
                  </span>
                </span>
                <span className={`whitespace-nowrap font-medium ${a.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{tl2(a.balance)}</span>
              </button>
            ))}
          </div>
          {current && <AccountMovements account={current} onEdit={() => setEditing(current)} />}
        </div>
      )}
      </PageShell>
      {editing && <AccountForm account={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {transfer && <TransferForm accounts={list} onClose={() => setTransfer(false)} />}
      {imp.dialog}
    </>
  )
}

function AccountMovements({ account, onEdit }: { account: CashAccount; onEdit: () => void }) {
  const movements = useQuery({ queryKey: ['cash-accounts', account.id, 'movements'], queryFn: () => get<CashMovement[]>(`/cash-accounts/${account.id}/movements`) })
  const transfers = useQuery({ queryKey: ['cash-accounts', 'transfers'], queryFn: () => get<CashTransfer[]>('/cash-transfers') })
  const [deleting, setDeleting] = useState(false)
  const remove = useSave(() => del(`/cash-accounts/${account.id}`), { invalidate: ['cash-accounts'], success: 'Hesap silindi.', onSuccess: () => setDeleting(false) })
  const removeTransfer = useSave((id: number) => del(`/cash-transfers/${id}`), { invalidate: ['cash-accounts'], success: 'Virman silindi.' })
  const rows = [...(movements.data ?? [])].reverse()
  const mine = (transfers.data ?? []).filter((t) => t.fromAccountId === account.id || t.toAccountId === account.id).slice(0, 10)
  return (
    <div className="space-y-4 lg:col-span-2">
      <Card title={account.name} icon={<Landmark className="size-4" />} bodyClassName="p-0"
        actions={<>
          <IconButton write label="Düzenle" onClick={onEdit}><Pencil className="size-4" /></IconButton>
          <IconButton write label="Sil" onClick={() => setDeleting(true)}><Trash2 className="size-4" /></IconButton>
        </>}>
        {account.iban && <p className="border-b border-slate-100 px-4 py-2 text-sm text-slate-600">IBAN: {account.iban}</p>}
        {movements.isLoading ? <Spinner /> : rows.length === 0 ? <Empty>Bu hesapta hareket yok.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Tarih</th><th className="th">İşlem</th><th className="th text-right">Giriş</th><th className="th text-right">Çıkış</th><th className="th text-right">Bakiye</th></tr></thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={i}>
                    <td className="td">{date(m.date)}</td>
                    <td className="td"><Badge tone={m.in > 0 ? 'green' : m.kind === 'Virman' ? 'blue' : 'gray'}>{m.kind}</Badge>
                      <span className="block max-w-72 truncate text-sm text-slate-500">{m.link ? <Link className="underline" to={m.link}>{m.description}</Link> : m.description}</span></td>
                    <td className="td text-right text-emerald-700">{m.in ? tl2(m.in) : ''}</td>
                    <td className="td text-right text-red-600">{m.out ? tl2(m.out) : ''}</td>
                    <td className="td text-right font-medium">{tl2(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {mine.length > 0 && (
        <Card title="Son virmanlar" icon={<ArrowLeftRight className="size-4" />} bodyClassName="p-0">
          <ul className="divide-y divide-slate-100">
            {mine.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="flex-1">{date(t.date)} · {t.fromAccountName} → {t.toAccountName}{t.note && <span className="text-slate-500"> · {t.note}</span>}</span>
                <span className="font-medium">{tl2(t.amount)}</span>
                <IconButton write label="Virmanı sil" onClick={() => removeTransfer.mutate(t.id)}><Trash2 className="size-4" /></IconButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ConfirmDialog open={deleting} title="Hesabı sil" confirmText="Sil" loading={remove.isPending}
        message="Hareketi olan hesap silinemez; pasife alabilirsiniz." onClose={() => setDeleting(false)} onConfirm={() => remove.mutate(undefined)} />
    </div>
  )
}

function AccountForm({ account, onClose }: { account: CashAccount | null; onClose: () => void }) {
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? { name: account.name, kind: account.kind, iban: account.iban ?? '', openingBalance: account.openingBalance, openingBalanceDate: account.openingBalanceDate ?? '', isActive: account.isActive }
      : { name: '', kind: 'Bank', iban: '', openingBalance: 0, openingBalanceDate: todayIso(), isActive: true },
  })
  const kind = useWatch({ control, name: 'kind' })
  const save = useSave((v: AccountValues) => account ? put(`/cash-accounts/${account.id}`, nullify(v)) : post('/cash-accounts', nullify(v)),
    { invalidate: ['cash-accounts'], success: 'Hesap kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={account ? 'Hesap Düzenle' : 'Hesap Ekle'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field group label="Ne tür hesap?">
          <ControlledChoice control={control} name="kind" label="Hesap türü" columns={2} options={choices(cashAccountKindLabel, cashAccountKindIcon)} />
        </Field>
        <Field label="Hesap adı" required error={errors.name?.message}><input className="input" placeholder="İş Bankası TL, Merkez Kasa" {...register('name')} /></Field>
        {kind === 'Bank' && <Field label="IBAN" error={errors.iban?.message}><input className="input font-mono" placeholder="TR.." {...register('iban')} /></Field>}
        <Field label="Açılış bakiyesi" error={errors.openingBalance?.message} hint={kind === 'CreditCard' ? 'Kart borcu varsa başına eksi yazın (ör. -12.500).' : 'Sisteme geçtiğiniz gün hesapta olan para.'}>
          <AmountInput control={control} name="openingBalance" words={false} />
        </Field>
        <Field label="Açılış tarihi"><DateQuick control={control} name="openingBalanceDate" /></Field>
        <Field group label="Durum">
          <ControlledToggle control={control} name="isActive" label="Hesap durumu" labels={['Aktif', 'Pasif']} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

const transferSchema = z.object({
  fromAccountId: z.number({ error: 'Hesap seçin.' }),
  toAccountId: z.number({ error: 'Hesap seçin.' }),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  note: optStr,
}).refine((v) => v.fromAccountId !== v.toAccountId, { path: ['toAccountId'], message: 'Çıkış ve giriş hesabı aynı olamaz.' })
type TransferValues = z.infer<typeof transferSchema>

function TransferForm({ accounts, onClose }: { accounts: CashAccount[]; onClose: () => void }) {
  const active = accounts.filter((a) => a.isActive)
  const accountOptions = active.map((a) => ({ value: a.id, label: a.name, icon: cashAccountKindIcon[a.kind], hint: tl2(a.balance) }))
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { fromAccountId: active[0]?.id, toAccountId: active[1]?.id, date: todayIso(), note: '' },
  })
  const save = useSave((v: TransferValues) => post('/cash-transfers', nullify(v)),
    { invalidate: ['cash-accounts'], success: 'Virman kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title="Virman (hesaplar arası aktarım)" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field group label="Para hangi hesaptan çıktı?" error={errors.fromAccountId?.message}>
          <ControlledChoice control={control} name="fromAccountId" label="Çıkış hesabı" columns={2} options={accountOptions} />
        </Field>
        <Field group label="Hangi hesaba girdi?" error={errors.toAccountId?.message}>
          <ControlledChoice control={control} name="toAccountId" label="Giriş hesabı" columns={2} options={accountOptions} />
        </Field>
        <Field label="Tutar" required error={errors.amount?.message}><AmountInput control={control} name="amount" /></Field>
        <Field label="Tarih" error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field label="Not"><input className="input" placeholder="Kasadan bankaya yatırıldı" {...register('note')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
