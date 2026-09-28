import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('harita, sefer dosyaları ve müşteri takip linki', async ({ page, context }) => {
  await login(page)

  // Harita: örnek veride yoldaki araç konumu var
  await page.getByRole('link', { name: 'Araç Takip Haritası' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(page.locator('.leaflet-marker-pane').getByText('34 VES 01')).toBeVisible()
  await page.getByRole('button', { name: /^34 VES 01 Yolda/ }).click()
  await expect(page.locator('path.leaflet-interactive')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/desktop-map.png' })

  // Yoldaki seferi aç → Dosyalar sekmesi → PDF yükle
  await page.getByRole('link', { name: 'Seferler' }).click()
  await page.getByPlaceholder('Müşteri, plaka, şoför, adres...').fill('34 VES 01')
  await page.getByRole('row', { name: /Yolda/ }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  await dialog.getByRole('button', { name: 'Dosyalar / Fotoğraflar' }).click()
  await dialog.getByLabel('Dosya seç').setInputFiles({ name: 'irsaliye.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%test\n') })
  await expect(page.getByText('Dosya yüklendi.')).toBeVisible()
  await expect(dialog.getByText('irsaliye.pdf').first()).toBeVisible()

  // Takip linki
  await dialog.getByRole('button', { name: 'Takip ve Rota' }).click()
  await expect(dialog.locator('.leaflet-container')).toBeVisible()
  await dialog.getByRole('button', { name: 'Takip Linki Oluştur' }).click()
  const url = await dialog.getByLabel('Takip linki').inputValue()
  expect(url).toMatch(/\/takip\/[\w-]+$/)
  await expect(dialog.getByRole('link', { name: 'WhatsApp ile Gönder' })).toHaveAttribute('href', /wa\.me/)

  // Giriş yapmamış müşteri gözüyle
  const anon = await context.browser()!.newContext()
  const p2 = await anon.newPage()
  await p2.goto(url.replace(/^https?:\/\/[^/]+/, 'http://localhost:5173'))
  await expect(p2.getByText('Araç yolda')).toBeVisible()
  await expect(p2.getByText('Araç: 34 VES **')).toBeVisible()
  await expect(p2.locator('.leaflet-container')).toBeVisible()
  await expect(p2.getByText('25.000')).toHaveCount(0)
  await p2.screenshot({ path: 'e2e/screenshots/public-tracking.png' })
  await anon.close()
})

test('şoför hesabı web panelinde mobil uygulamaya yönlendirilir', async ({ page }) => {
  await page.goto('/giris')
  await page.getByLabel('E-posta').fill('sofor@yeslojistik.com')
  await page.getByLabel('Şifre').fill('Sofor123!')
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page.getByText('Şoför hesabı')).toBeVisible()
})
