import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { del, get, post, put } from '../api/client'
import type { InvoiceNote, InvoiceNoteKind } from '../api/types'
import { useSave } from '../lib/hooks'
import { invoiceNoteKindLabel, options } from '../lib/labels'
import { ChoiceChips } from './Choice'
import { DataTable, type Column } from './DataTable'
import { Button, Card, ConfirmDialog, Field, IconButton, Modal } from './ui'

/** Faturaya eklenecek hazır notlar (eski paneldeki "Fatura Notları"): hesap adı, IBAN ve açıklama; müşteri şablonunda seçilir. */
export function InvoiceNotesCard() {
  const { data, isFetching, error, refetch } = useQuery({ queryKey: ['invoice-notes'], queryFn: () => get<InvoiceNote[]>('/invoice-notes') })
  const [editing, setEditing] = useState<InvoiceNote | 'new' | null>(null)
  const [deleting, setDeleting] = useState<InvoiceNote | null>(null)
  const deleteMut = useSave((id: number) => del(`/invoice-notes/${id}`), { invalidate: ['invoice-notes', 'customers'], success: 'Not silindi.', onSuccess: () => setDeleting(null) })
  const columns: Column<InvoiceNote>[] = [
    { key: 'title', header: 'Başlık', render: (n) => <span className="font-medium">{n.title}</span> },
    { key: 'kind', header: 'Fatura Tipi', render: (n) => invoiceNoteKindLabel[n.kind] },
    { key: 'account', header: 'Hesap', render: (n) => n.accountName ?? '—' },
    { key: 'iban', header: 'IBAN', render: (n) => n.iban ?? '—' },
    { key: 'text', header: 'Açıklama', className: 'whitespace-normal! min-w-48', render: (n) => n.text ?? '' },
    { key: 'actions', header: '', align: 'right', render: (n) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton label="Düzenle" onClick={() => setEditing(n)}><Pencil className="size-4" /></IconButton>
        <IconButton label="Sil" onClick={() => setDeleting(n)}><Trash2 className="size-4" /></IconButton>
      </div>
    ) },
  ]
  return (
    <Card title="Fatura Notları" icon={<FileText className="size-4" />} bodyClassName="p-0"
      actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Not</Button>}>
      <p className="px-6 pt-4 text-sm text-slate-600">Müşterinin fatura şablonunda seçilen not, yeni faturanın açıklamasına kendiliğinden yazılır.</p>
      <DataTable columns={columns} rows={data} loading={isFetching} error={error} onRetry={refetch} rowKey={(n) => n.id} onRowClick={setEditing}
        empty="Henüz fatura notu yok. “Yeni Not” ile banka hesabınızı ve açıklamayı ekleyin." />
      {editing && <NoteForm note={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Notu sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>“{deleting?.title}” silinecek. Bu notu kullanan müşteri şablonlarından da kaldırılır.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </Card>
  )
}

function NoteForm({ note, onClose }: { note: InvoiceNote | null; onClose: () => void }) {
  const [kind, setKind] = useState<InvoiceNoteKind>(note?.kind ?? 'Sale')
  const [title, setTitle] = useState(note?.title ?? '')
  const [accountName, setAccountName] = useState(note?.accountName ?? '')
  const [iban, setIban] = useState(note?.iban ?? '')
  const [text, setText] = useState(note?.text ?? '')
  const body = { kind, title, accountName: accountName || null, iban: iban || null, text: text || null }
  const save = useSave(() => note ? put<InvoiceNote>(`/invoice-notes/${note.id}`, body) : post<InvoiceNote>('/invoice-notes', body), {
    invalidate: ['invoice-notes'], success: note ? 'Not güncellendi.' : 'Not eklendi.', onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title={note ? 'Fatura Notu' : 'Yeni Fatura Notu'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Kaydet</Button></>}>
      <div className="space-y-3">
        <Field group label="Fatura tipi">
          <ChoiceChips label="Fatura tipi" value={kind} onChange={setKind} options={options(invoiceNoteKindLabel)} />
        </Field>
        <Field label="Başlık" required><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Akbank hesabı" /></Field>
        <Field label="Hesap İsmi"><input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} /></Field>
        <Field label="IBAN"><input className="input uppercase" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" /></Field>
        <Field label="Açıklama"><textarea className="input min-h-20" value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
