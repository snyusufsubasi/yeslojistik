import clsx from 'clsx'

/**
 * Otoyol logosu: sarı zeminli küçük "YES" kutusu ve yanında "Lojistik" (sol menüdekiyle aynı).
 * `dark`: açık zemin üstünde (yazı koyu); yoksa koyu yeşil zemin üstünde (yazı beyaz). `size="lg"`: giriş sayfası gibi tek başına durduğu yerler.
 */
export function Logo({ dark, size = 'md', className }: { dark?: boolean; size?: 'md' | 'lg'; className?: string }) {
  const lg = size === 'lg'
  return (
    <div className={clsx('flex items-center', lg ? 'gap-2.5' : 'gap-2', className)}>
      <span className={clsx('rounded-[2px] bg-hl font-extrabold leading-none tracking-[0.04em] text-side',
        lg ? 'px-2 pb-1 pt-1.5 text-[1.125rem]' : 'px-1.5 pb-0.5 pt-1 text-[0.8125rem]')}>YES</span>
      <span className={clsx('font-bold tracking-[-0.01em]', lg ? 'text-[1.5rem]' : 'text-[1.0625rem]', dark ? 'text-fg' : 'text-white')}>Lojistik</span>
    </div>
  )
}
