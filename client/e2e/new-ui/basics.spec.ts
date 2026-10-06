import { expect, test } from '@playwright/test'
import { login, useNewUi } from '../helpers'

test('görünüm anahtarı: kullanıcı menüsünden Yeni seçilir ve sayfa yenilenince kalır', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Hesabım' }).click()
  await page.getByRole('radio', { name: 'Yeni (sade)' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'new')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Bugün', exact: true })).toBeVisible()
  // Geri al: öbür testler klasik görünümle çalışır.
  await page.getByRole('button', { name: 'Hesabım' }).click()
  await page.getByRole('radio', { name: 'Klasik' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'classic')
})

test('yeni menü pratikortam sırasında; bölüm sekmeleri sayfalar arasında geçer', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  const menu = page.getByRole('navigation', { name: 'Ana menü' })
  const labels = await menu.getByRole('link').allInnerTexts()
  const names = labels.map((l) => l.replace(/\d+$/, '').trim())
  expect(names).toEqual(['Bugün', 'e-Fatura', 'Müşteriler Cari', 'Tedarikçiler Cari', 'Tedarikçi Ödemeleri', 'Analiz', 'Sevkiyatlar',
    'Müşteri Listesi', 'Tedarikçi Listesi', 'Şoför Listesi', 'Personel Listesi', 'Sabit Ödeme Listesi', 'Giderler', 'Mazotlar',
    'Araç Masrafları', 'Araçlar', 'Yönetici', 'Bankalar', 'Çekler'])

  await menu.getByRole('link', { name: 'Müşteriler Cari' }).click()
  const tabs = page.getByRole('navigation', { name: 'Bölüm sekmeleri' })
  await expect(tabs.getByRole('tab', { name: 'Bakiyeler' })).toHaveAttribute('aria-selected', 'true')
  await tabs.getByRole('tab', { name: 'Tahsilatlar' }).click()
  await expect(page).toHaveURL(/\/tahsilatlar$/)
  await expect(tabs.getByRole('tab', { name: 'Tahsilatlar' })).toHaveAttribute('aria-selected', 'true')

  await menu.getByRole('link', { name: 'Bankalar' }).click()
  await expect(page.getByRole('heading', { name: 'Bankalar', level: 1 })).toBeVisible()
})

test('Sevkiyatlar: süzgeç paneli, süzgeç çipi ve satır menüsü', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('button', { name: /^Süzgeç/ }).click()
  const panel = page.getByRole('dialog', { name: 'Süzgeç' })
  await panel.getByLabel('Durum', { exact: true }).selectOption('Planned')
  await panel.getByRole('button', { name: 'Listeyi göster' }).click()
  await expect(panel).toBeHidden()
  const chip = page.getByRole('button', { name: /Durum: Planlandı/ })
  await expect(chip).toBeVisible()
  await expect(page).toHaveURL(/status=Planned/)
  await chip.click()
  await expect(page).not.toHaveURL(/status=Planned/)

  await page.getByRole('button', { name: 'İşlemler' }).first().click()
  await page.getByRole('menuitem', { name: 'Düzenle' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
