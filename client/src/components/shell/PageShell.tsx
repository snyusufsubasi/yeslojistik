import type { ReactNode } from 'react'
import { MoreMenu, useVisibleItems, type MenuItem } from './Menu'
import { Button, PageHeader } from '../ui'
import { useIsNewUi } from '../../lib/uiMode'

export interface PageShellProps {
  /** Yeni görünümde `newTitles` varsa o yazar (PageHeader karar verir). */
  title: string
  /** Klasik görünümde görünür; yeni görünümde gizlenir. */
  subtitle?: ReactNode
  /** Yeni görünümde "⋯ Diğer" menüsü; klasik görünümde düz düğmeler. */
  more?: MenuItem[]
  /** Yeni görünümde en sağdaki tek ana düğme. Klasik görünümde `actions` içinde verilir. */
  primary?: ReactNode
  /** Klasik görünüm düğmeleri (Excel, PDF, içe aktar, ana düğme). */
  actions?: ReactNode
  back?: { to: string; label: string }
  children: ReactNode
}

/**
 * Sayfa iskeleti — şartname: docs/plan/28-ORTAK-PARCALAR.md.
 *
 * Yeni görünüm: başlık şeridi + "⋯ Diğer" menüsü + TEK ana düğme; alt başlık çizilmez.
 * Klasik görünüm: bugünkü düğme dizisi aynen korunur (`actions`).
 * Görünürlük süzgeci (`hidden`, ayna modunda `write`, yetkisiz `perm`) menüyle aynı kuralı kullanır.
 */
export function PageShell({ title, subtitle, more = [], primary, actions, back, children }: PageShellProps) {
  const isNew = useIsNewUi()
  const visible = useVisibleItems(more)
  const right = isNew ? (
    <>
      {visible.length > 0 && <MoreMenu items={more} />}
      {primary}
    </>
  ) : actions

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} back={back} actions={right} />
      {children}
    </>
  )
}

/** Klasik görünümde menü maddelerini düz düğme olarak çizmek için yardımcı (PageShell kullanır). */
export function MenuItemsAsButtons({ items }: { items: MenuItem[] }) {
  const visible = useVisibleItems(items)
  return <>{visible.map((i) => <Button key={i.label} variant="secondary" icon={i.icon} onClick={i.onClick}>{i.label}</Button>)}</>
}
