import { expect, test, type APIRequestContext, type APIResponse, type Locator } from '@playwright/test'
import { login, unique, useNewUi } from '../helpers'

/**
 * Mazotlar (`/mazotlar`) — şartname: docs/plan/19-OZ-MAL-MAZOTLAR.md.
 *
 * Sınananlar: menüden tek tıkla açılır; liste yalnız yakıt kaydı gösterir; şerit "toplam litre · km ·
 * ortalama litre/100km · km başı maliyet" ile satırların toplamını verir; "+ Mazot Ekle" formu Fuel
 * sabit (kilitli kategori) açar; satır menüsünden "Düzenle" ve `?id=` adresi mevcut düzenleme
 * penceresini açar; araç süzgeci başka aracın deposunu bırakmaz; telefonda kart görünümü vardır.
 *
 * Veri API üzerinden, oturum çereziyle ve benzersiz plakayla kurulur (birikmiş örnek veri karışmasın).
 * Her koşu kendi plaka harflerini verir (`plateTag` / `otherTag`), böylece testler birbirinin verisine dokunmaz.
 */
async function fuelSetup(request: APIRequestContext, id: string, plateTag: string, otherTag: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  // Tarayıcı Europe/Istanbul'da koşar; kaydın tarihi oradaki "bugün" olsun (varsayılan dönem bu aydır).
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
  const plate = `34 ${plateTag} ${id.slice(-4)}`
  const otherPlate = `34 ${otherTag} ${id.slice(-4)}`
  const vehicle = await ok<{ id: number }>(request.post('/api/vehicles', {
    data: { plate, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' },
  }))
  const other = await ok<{ id: number }>(request.post('/api/vehicles', {
    data: { plate: otherPlate, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' },
  }))
  const fill = (vehicleId: number, odometer: number, previousOdometer: number, liters: number, amount: number, station: string) =>
    ok<{ id: number }>(request.post('/api/expenses', {
      data: { category: 'Fuel', amount, date: today, vehicleId, description: `E2E Mazot ${id}`, liters, odometer,
        details: { previousOdometer, fuelStation: station, fuelType: 'Dizel' } },
    }))
  // İki depo: 205 L + 100 L = 305 L; fark km 500 + 500 = 1.000 km → ortalama 30,5 L/100 km, km başı 6,00 TL.
  const first = await fill(vehicle.id, 1000, 500, 205, 4000, 'Shell Gebze')
  await fill(vehicle.id, 1500, 1000, 100, 2000, 'Opet İzmit')
  // Yakıt olmayan kayıt aynı araçta durur: Mazotlar listesinde görünmemeli.
  await ok(request.post('/api/expenses', {
    data: { category: 'Maintenance', amount: 750, date: today, vehicleId: vehicle.id, description: `E2E Bakım ${id}` },
  }))
  // Başka aracın deposu: araç süzgeci bunu bırakmamalı.
  await fill(other.id, 800, 300, 50, 1000, 'Petrol Ofisi')
  return { plate, otherPlate, vehicleId: vehicle.id, firstFuelId: first.id, maintenance: `E2E Bakım ${id}` }
}

/** Şeritteki kutuyu etiketinden bulur (SumStrip: etiket ve değer aynı kutunun içinde). */
function stripBox(strip: Locator, label: string) {
  return strip.getByText(label, { exact: true }).locator('..')
}

test('Mazotlar: menüden açılır, şerit litre/km toplamlarını verir, form Fuel sabit açılır', async ({ page }) => {
  const id = unique()
  await useNewUi(page)
  await login(page)
  const data = await fuelSetup(page.request, id, 'MZ', 'ZM')

  // 1) Menüden tek tıkla açılır (yeni görünüm "Öz Mal" grubu).
  const menu = page.getByRole('navigation', { name: 'Ana menü' })
  await menu.getByRole('link', { name: 'Mazotlar' }).click()
  await expect(page).toHaveURL(/\/mazotlar$/)
  await expect(page.getByRole('heading', { name: 'Mazotlar', level: 1 })).toBeVisible()

  // 2) Araç süzgeci: yalnız bu aracın depoları; bakım kaydı ve öbür aracın deposu listede yok.
  // (Süzgeç kutuları da plakayı yazar; bu yüzden arama tabloya daraltılır.)
  await page.goto(`/mazotlar?arac=${data.vehicleId}`)
  const table = page.locator('main table')
  await expect(table.getByText(data.plate).first()).toBeVisible()
  await expect(table.getByText('Shell Gebze')).toBeVisible()
  await expect(table.getByText(data.maintenance)).toHaveCount(0)
  await expect(table.getByText(data.otherPlate)).toHaveCount(0)

  // 3) Şerit: litre ve km toplamı sunucudan, ortalama ve km başı maliyet onlardan hesaplanır.
  const strip = page.getByLabel('Mazot toplamları')
  await expect(strip).toBeVisible()
  await expect(stripBox(strip, 'Kayıt')).toContainText('2')
  await expect(stripBox(strip, 'Toplam litre')).toContainText('305 L')
  await expect(stripBox(strip, 'Tutar')).toContainText('6.000,00 TL')
  await expect(stripBox(strip, 'Km')).toContainText('1.000 km')
  await expect(stripBox(strip, 'Ortalama litre/100km')).toContainText('30,5')
  await expect(stripBox(strip, 'Km başı maliyet')).toContainText('6,00 TL')

  // 4) Satır menüsü: "Düzenle" kaydı aynı düzenleme penceresinde açar; "Fişi gör" yalnız fişi olan satırda çıkar.
  const row = table.locator('tbody tr').filter({ hasText: 'Shell Gebze' })
  await row.getByRole('button', { name: 'İşlemler' }).click()
  await expect(page.getByRole('menuitem', { name: 'Düzenle' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Fişi gör' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Düzenle' }).click()
  const edit = page.getByRole('dialog', { name: 'Gider Düzenle' })
  await expect(edit).toBeVisible()
  await expect(edit.getByRole('radiogroup', { name: 'Kategori' }).getByRole('radio')).toHaveText(/Yakıt/)
  await expect(edit.getByLabel(/^Litre/)).toHaveValue(/^205$/)
  await edit.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(edit).toBeHidden()

  // 5) "+ Mazot Ekle": kategori Yakıt olarak kilitli; yakıt alanları ilk bakışta görünür.
  await page.goto(`/mazotlar?arac=${data.vehicleId}`)
  await page.getByRole('button', { name: '+ Mazot Ekle' }).first().click()
  const add = page.getByRole('dialog', { name: 'Gider Ekle' })
  await expect(add).toBeVisible()
  const addCategories = add.getByRole('radiogroup', { name: 'Kategori' })
  await expect(addCategories.getByRole('radio')).toHaveCount(1)
  await expect(addCategories.getByRole('radio')).toBeDisabled()
  await expect(addCategories.getByRole('radio')).toHaveText(/Yakıt/)
  await expect(addCategories.getByRole('radio', { name: 'Bakım/Onarım' })).toHaveCount(0)
  await expect(add.getByLabel(/^Litre/)).toBeVisible()
  await expect(add.getByLabel(/^Araç kilometresi/)).toBeVisible()
  await add.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(add).toBeHidden()

  // 6) `?id=<gider>` adresi de mevcut düzenleme penceresini açar (satır menüsünün gittiği adres).
  await page.goto(`/giderler?id=${data.firstFuelId}&kategori=Fuel`)
  const direct = page.getByRole('dialog', { name: 'Gider Düzenle' })
  await expect(direct).toBeVisible()
  await expect(direct.getByLabel(/^Litre/)).toHaveValue(/^205$/)
  await expect(direct.getByLabel(/^İstasyon/)).toHaveValue('Shell Gebze')
})

test.describe('telefon', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

  test('Mazotlar: telefonda kart görünümü, satır menüsü ve yatay kaydırma yok', async ({ page }) => {
    const id = unique()
    await useNewUi(page)
    await login(page)
    const data = await fuelSetup(page.request, id, 'MN', 'NM')

    await page.goto(`/mazotlar?arac=${data.vehicleId}`)
    await page.waitForLoadState('networkidle')
    // Kart görünümü: tablo gizli, kart listesi görünür.
    const cards = page.locator('main ul.divide-y').first()
    await expect(cards).toBeVisible()
    await expect(page.locator('main table')).toBeHidden()
    await expect(cards.getByText('Shell Gebze')).toBeVisible()

    // Kartta "Düzenle" ve "⋯ İşlemler" (44px dokunma hedefi) vardır.
    const first = cards.locator('> li').first()
    await expect(first.getByRole('button', { name: 'Düzenle' })).toBeVisible()
    const menuBox = await first.getByRole('button', { name: 'İşlemler' }).boundingBox()
    expect(menuBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(menuBox?.height ?? 0).toBeGreaterThanOrEqual(44)

    // Şerit telefonda da toplamları verir.
    const strip = page.getByLabel('Mazot toplamları')
    await expect(strip).toBeVisible()
    await expect(stripBox(strip, 'Toplam litre')).toContainText('305 L')

    // Yatay kaydırma yok.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, '/mazotlar yatay taşma').toBeLessThanOrEqual(1)
  })
})
