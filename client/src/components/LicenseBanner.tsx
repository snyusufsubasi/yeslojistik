import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../lib/auth'
import { licenseNotice, useLicense } from '../lib/license'

/** Abonelik bitmek üzereyken / bittiğinde üst bant (bakım ve ayna bantlarıyla aynı biçim). Sahip modunda hiç görünmez. */
export function LicenseBanner() {
  const { can } = useAuth()
  const { data } = useLicense()
  const notice = licenseNotice(data)
  if (!notice) return null
  return (
    <div role="status" data-testid="license-banner"
      className={clsx('border-b border-line px-4 py-1.5 text-center text-[0.8125rem] font-semibold', notice.tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn')}>
      {notice.text}{' '}
      {can('admin')
        ? <Link to="/ayarlar?tab=license" className="underline">Abonelik</Link>
        : <span className="font-normal">Yöneticinizle görüşün.</span>}
    </div>
  )
}
