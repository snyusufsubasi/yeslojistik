import { cities } from '../lib/cities'

/** İl seçim kutusunun seçenekleri: <select className="input" {...register('city')}><CityOptions /></select> */
export function CityOptions({ placeholder = 'İl seçin' }: { placeholder?: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
    </>
  )
}
