import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { RowMenu, type MenuItem } from './Menu'
import type { Tone } from '../../lib/labels'
import { Badge } from '../ui'

/**
 * Telefon kartı — şartname: docs/plan/27-TELEFON.md.
 *
 * Liste ekranları 640px altında tablo yerine bu kartları gösterir (DataTable'ın `mobileCard` prop'u).
 * Kart: başlık + 2-3 satır bilgi + sağda mono tutar + "⋯" satır menüsü. Dokunma hedefleri ≥44px
 * (kart gövdesi en az 4.5rem, "⋯" düğmesi `size-11` = 2.75rem, menü maddeleri `min-h-11`).
 * Masaüstünde kart hiç çizilmez: `DataTable` kart listesini `sm:hidden`, tabloyu `hidden sm:block` ile
 * ayırır (DataTable.tsx). Bu dosya yalnız kart gövdesini tanımlar; veri ve süzgeç sayfanın kendisindedir.
 *
 * `cards` çağrısı zaten yalnız telefonda yapıldığı için burada ayrıca medya sorgusu gerekmez.
 */
export type MobileCard = {
  /** Liste anahtarı (DataTable `rowKey` ile aynı). */
  id: string | number
  /** Kart başlığı: en çok bir satır, uzun metin kırpılır. */
  title: ReactNode
  /** Bilgi satırları: 2-3 satır önerilir (kart ≤120px). */
  info?: ReactNode
  /** Sağdaki tutar/sayı: Overpass Mono ile hizalanır. */
  amount?: ReactNode
  /** Başlığın yanındaki durum rozeti: satırda en fazla 1 rozet kuralı korunur. */
  badge?: { tone: Tone; label: ReactNode }
  /** Sağda ikon: yalnız `onOpen` yokken çizilir (yer kaplamasın). */
  icon?: LucideIcon
  /** Karta dokunma: ayrıntıyı açar. */
  onOpen?: () => void
  /** "⋯" satır menüsü maddeleri; boş ya da ayna/yetki süzgecinden sonra boşsa menü çizilmez. */
  menu?: MenuItem[]
}

/**
 * Kart listesi: telefon genişliğinde tablonun yerini alır.
 *
 * `DataTable` her kartı kendi `<li>` ögesi içinde çizer (`DataTable.tsx`), bu yüzden burada `<ul>`
 * sarmalayıcı yoktur; kart gövdesi bu ögenin içine oturur. Kart dizisi tek satırlık (`cards={[...]}`)
 * verilir: aynı sayfa tabloyu masaüstünde, kartı telefonda aynı veriyle çizer.
 */
export function MobileCards({ cards, menuLabel = 'İşlemler' }: { cards: MobileCard[]; menuLabel?: string }) {
  return (
    <ul className="divide-y divide-slate-100">
      {cards.map((c) => <li key={c.id}><MobileCardBody card={c} menuLabel={menuLabel} /></li>)}
    </ul>
  )
}

function MobileCardBody({ card: c, menuLabel }: { card: MobileCard; menuLabel: string }) {
  const Icon = c.icon
  return (
    <div
      role={c.onOpen ? 'button' : undefined}
      tabIndex={c.onOpen ? 0 : undefined}
      onClick={c.onOpen}
      onKeyDown={c.onOpen ? (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        // Enter/Space kartı açar; menü düğmesi kendi olayını durdurur.
        e.preventDefault()
        c.onOpen?.()
      } : undefined}
      className={clsx('flex min-h-[4.5rem] items-start gap-3 px-4 py-3.5', c.onOpen && 'cursor-pointer active:bg-surface-2')}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold text-fg">{c.title}</span>
          {c.badge && <Badge tone={c.badge.tone}>{c.badge.label}</Badge>}
        </div>
        {c.info && <div className="line-clamp-3 break-words text-[0.8125rem] leading-snug text-muted">{c.info}</div>}
      </div>
      {(c.amount != null || c.menu || Icon) && (
        // min-h-11: sağdaki işlem sütunu (⋯ düğmesi) her durumda ≥44px kalsın; dokunma hedefi ölçüsü kart gövdesine bağlı olmasın.
        <div className="flex min-h-11 shrink-0 items-center gap-1.5">
          {c.amount != null && <span className="text-[0.9375rem] font-semibold tabular-nums text-fg">{c.amount}</span>}
          {c.menu && c.menu.length > 0
            ? <RowMenu items={c.menu} label={menuLabel} />
            : Icon && <Icon className="size-5 text-muted" />}
        </div>
      )}
    </div>
  )
}
