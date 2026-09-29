import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowLeftRight, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { del, get, post, put } from '../api/client'
import type { CashAccount, CashMovement, CashTransfer } from '../api/types'
import { Badge, Button, Card, ConfirmDialog, Empty, Field, IconButton, Modal, PageHeader, Spinner } from '../components/ui'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { date, moneyHint, tl2, todayIso } from '../lib/format'
import { useSave } from '../lib/hooks'
import { cashAccountKindLabel } from '../lib/labels'

const accountSchema = z.object({
  name: req('Hesap adı zorunlu.'),
  kind: z.enum(['Cash', 'Bank', 'Pos', 'CreditCard']),
  iban: optStr,
  openingBalance: z.number({ error: 'Tutar girin (yoksa 0).' }),
  openingBalanceDate: optStr,
  isActive: z.boolean(),
})
type AccountValues = z.infer<typeof accountSchema>

/** Kasa, banka, POS ve kredi kartı hesapları; bakiye tahsilat, ödeme, gider ve virmanlardan hesaplanır. */
export default function CashAccountsPage() {
  const accounts = useQuery({ queryKey: ['cash-accounts'], queryFn: () => get<CashAccount[]>('/cash-accounts') })
  const [editing, setEditing] = useState<CashAccount | 'new' | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [transfer, setTransfer] = useState(false)
  const list = accounts.data ?? []
  const current = list.find((a) => a.id === selected) ?? list[0]
  const total = list.filter((a) => a.isActive && a.kind !== 'CreditCard').reduce((s, a) => s + a.balance, 0)

  return (
    <>
      <PageHeader title="Kasa / Banka" subtitle={<>Hesap bakiyeleri. Toplam nakit ve banka: <b>{tl2(total)}</b></>}
        actions={<>
          <Button variant="secondary" icon={<ArrowLeftRight className="size-4" />} disabled={list.length < 2} onClick={() => setTransfer(true)}>Virman</Button>
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Hesap Ekle</Button>
        </>} />
      <p className="mb-3 text-sm text-slate-600">Tahsilat, taşeron ödemesi, gider ve şoför ödemesi girerken “Kasa / Banka” seçerseniz bakiye burada kendiliğinden hesaplanır. Çek/senet yalnızca tahsil edilince hesaba girer.</p>
      {accounts.isLoading ? <Spinner /> : list.length === 0 ? (
        <Card><Empty>Henüz hesap yok. “Hesap Ekle” ile kasa ve banka hesaplarınızı açılış bakiyeleriyle girin.</Empty></Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            {list.map((a) => (
              <button key={a.id} onClick={() => setSelected(a.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${current?.id === a.id ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy-900">{a.name}</span>
                  <span className="text-[13px] text-slate-500">{cashAccountKindLabel[a.kind]}{!a.isActive && ' · pasif'}</span>
                </span>
                <span className={`whitespace-nowrap font-semibold ${a.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{tl2(a.balance)}</span>
              </button>
            ))}
          </div>
          {current && <AccountMovements account={current} onEdit={() => setEditing(current)} />}
        </div>
      )}
      {editing && <AccountForm account={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {transfer && <TransferForm accounts={list} onClose={() => setTransfer(false)} />}
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
          <IconButton label="Düzenle" onClick={onEdit}><Pencil className="size-4" /></IconButton>
          <IconButton label="Sil" onClick={() => setDeleting(true)}><Trash2 className="size-4" /></IconButton>
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
                      <span className="block max-w-72 truncate text-[13px] text-slate-500">{m.link ? <Link className="underline" to={m.link}>{m.description}</Link> : m.description}</span></td>
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
                <IconButton label="Virmanı sil" onClick={() => removeTransfer.mutate(t.id)}><Trash2 className="size-4" /></IconButton>
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
  const opening = useWatch({ control, name: 'openingBalance' })
  const save = useSave((v: AccountValues) => account ? put(`/cash-accounts/${account.id}`, nullify(v)) : post('/cash-accounts', nullify(v)),
    { invalidate: ['cash-accounts'], success: 'Hesap kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={account ? 'Hesap Düzenle' : 'Hesap Ekle'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Hesap adı" required error={errors.name?.message}><input className="input" placeholder="İş Bankası TL, Merkez Kasa" {...register('name')} /></Field>
        <Field label="Tür"><select className="input" {...register('kind')}>{Object.entries(cashAccountKindLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        {kind === 'Bank' && <Field label="IBAN" error={errors.iban?.message}><input className="input" placeholder="TR.." {...register('iban')} /></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Açılış bakiyesi" error={errors.openingBalance?.message} hint={moneyHint(opening)}>
            <input className="input text-right" type="number" step="0.01" inputMode="decimal" {...register('openingBalance', { valueAsNumber: true })} />
          </Field>
          <Field label="Açılış tarihi"><input className="input" type="date" {...register('openingBalanceDate')} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isActive')} /> Aktif</label>
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
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { fromAccountId: active[0]?.id, toAccountId: active[1]?.id, date: todayIso(), note: '' },
  })
  const amount = useWatch({ control, name: 'amount' })
  const save = useSave((v: TransferValues) => post('/cash-transfers', nullify(v)),
    { invalidate: ['cash-accounts'], success: 'Virman kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title="Virman (hesaplar arası aktarım)" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Çıkış hesabı" error={errors.fromAccountId?.message}>
          <select className="input" {...register('fromAccountId', { valueAsNumber: true })}>{active.map((a) => <option key={a.id} value={a.id}>{a.name} ({tl2(a.balance)})</option>)}</select>
        </Field>
        <Field label="Giriş hesabı" error={errors.toAccountId?.message}>
          <select className="input" {...register('toAccountId', { valueAsNumber: true })}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih" error={errors.date?.message}><input className="input" type="date" {...register('date')} /></Field>
          <Field label="Tutar" error={errors.amount?.message} hint={moneyHint(amount)}>
            <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" {...register('amount', { valueAsNumber: true })} />
          </Field>
        </div>
        <Field label="Not"><input className="input" placeholder="Kasadan bankaya yatırıldı" {...register('note')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
