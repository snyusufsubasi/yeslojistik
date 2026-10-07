import clsx from 'clsx'
import { useBranding } from '../lib/branding'

/**
 * Panel logosu. Firma adı ayarda değiştirilmemişse (YES Lojistik): sarı zeminli küçük "YES" kutusu ve yanında "Lojistik".
 * Müşteri kendi adını/logosunu girdiyse (beyaz etiket): logosu (yoksa adının baş harfleri sarı kutuda) ve yanında firma adı.
 * Hark tarzında bütün zeminler açık: yazı her zaman koyu (`dark` geriye uyum için duruyor). `size="lg"`: giriş sayfası gibi tek başına durduğu yerler.
 */
export function Logo({ size = 'md', className }: { dark?: boolean; size?: 'md' | 'lg'; className?: string }) {
  const lg = size === 'lg'
  const brand = useBranding()
  const text = clsx('font-bold tracking-[-0.01em]', lg ? 'text-[1.5rem]' : 'text-[1.0625rem]', 'text-fg')
  const box = clsx('rounded-lg bg-hl font-extrabold leading-none tracking-[0.04em] text-slate-900', lg ? 'px-2 pb-1 pt-1.5 text-[1.125rem]' : 'px-1.5 pb-0.5 pt-1 text-[0.8125rem]')
  return (
    <div className={clsx('flex min-w-0 items-center', lg ? 'gap-2.5' : 'gap-2', className)}>
      {brand.isDefault ? (
        <>
          <span className={box}>YES</span>
          <span className={text}>Lojistik</span>
        </>
      ) : (
        <>
          {brand.logo
            ? <img src={brand.logo} alt="" className={clsx('shrink-0 rounded-md bg-white object-contain p-0.5', lg ? 'h-10 max-w-28' : 'h-7 max-w-14')} />
            : <span className={box}>{brand.initials}</span>}
          <span className={clsx(text, 'truncate', !lg && 'text-[0.9375rem]')}>{brand.name}</span>
        </>
      )}
    </div>
  )
}
