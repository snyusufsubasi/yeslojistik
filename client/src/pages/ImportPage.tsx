import { useSearchParams } from 'react-router-dom'
import { FileSpreadsheet } from 'lucide-react'
import { ImportWizard } from '../components/ImportWizard'
import { wizardEntities, type WizardEntity } from '../lib/importMeta'
import { Card, Chip, PageHeader } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useMirror } from '../lib/hooks'

/** Verileri Excel/CSV'den toplu aktarma: müşteri, tedarikçi, araç, şoför (cari devir bakiyeleri dahil). */
export default function ImportPage() {
  const { can } = useAuth()
  const { mirror } = useMirror()
  const [params, setParams] = useSearchParams()
  const options = wizardEntities.filter((e) => e.perm === 'any' || can('operations'))
  const asked = params.get('tur') as WizardEntity | null
  const entity = options.find((e) => e.value === asked)?.value ?? options[0].value

  return (
    <>
      <PageHeader title="Veri Aktarımı" subtitle="Eski programınızdaki ya da Excel'deki listeleri birkaç dakikada buraya alın." />
      {mirror ? (
        <Card><p className="text-[0.9375rem]">Pratikortam aynası açık: kayıtlar pratikortam'dan gelir, bu sayfadan aktarım yapılamaz.</p></Card>
      ) : (
        <Card title="Excel / CSV'den Aktar" icon={<FileSpreadsheet className="size-4" />}>
          <div role="tablist" aria-label="Aktarılacak liste" className="mb-5 flex flex-wrap gap-2">
            {options.map((e) => (
              <Chip key={e.value} role="tab" aria-selected={e.value === entity} active={e.value === entity}
                onClick={() => setParams({ tur: e.value }, { replace: true })}>{e.label}</Chip>
            ))}
          </div>
          <ImportWizard key={entity} entity={entity} />
          <p className="mt-6 border-t border-line pt-3 text-[0.8125rem] text-muted">
            Önerilen sıra: 1 Tedarikçiler → 2 Müşteriler → 3 Şoförler → 4 Araçlar. Sevkiyat, fatura, tahsilat ve gider gibi geçmiş kayıtlar için
            ilgili sayfadaki “Excel'den Aktar” düğmesini kullanın.
          </p>
        </Card>
      )}
    </>
  )
}
