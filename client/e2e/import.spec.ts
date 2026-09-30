import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { login } from './helpers'

test('Excel şablonu indir → yükle → kontrol et', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Şoförler', exact: true }).click()
  await page.getByRole('button', { name: "Excel'den Aktar" }).click()
  const dialog = page.getByRole('dialog', { name: /Şoför Aktarımı/ })
  const dl = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Şablonu İndir' }).click()
  const path = await (await dl).path()
  expect(fs.statSync(path).size).toBeGreaterThan(1000)

  // Şablondaki örnek satır (Mehmet Yılmaz) zaten kayıtlı → atlanacak
  await dialog.getByLabel('Excel dosyası').setInputFiles(path)
  await dialog.getByRole('button', { name: 'Kontrol Et' }).click()
  await expect(dialog.getByText(/1 satır kontrol edildi: 0 yeni kayıt/)).toBeVisible()
  await expect(dialog.getByText(/Mehmet Yılmaz zaten kayıtlı/)).toBeVisible()
})

test('eski sistemden fatura aktarımı: şablon indirilir, deneme kontrolü yeni kaydı gösterir', async ({ page }) => {
  await login(page)
  await page.goto('/faturalar')
  await page.getByRole('button', { name: "Excel'den Aktar" }).click()
  const dialog = page.getByRole('dialog', { name: /Fatura Aktarımı/ })
  await expect(dialog.getByText(/numarası korunur/)).toBeVisible()
  const dl = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Şablonu İndir' }).click()
  const path = await (await dl).path()
  await dialog.getByLabel('Excel dosyası').setInputFiles(path)
  await dialog.getByRole('button', { name: 'Kontrol Et' }).click()
  // Örnek satır (Yıldız Mobilya, 25.000 + %20 KDV − 2/10 tevkifat = 29.000) hatasız geçer; yalnız kontrol edildi, yazılmadı.
  await expect(dialog.getByText(/1 satır kontrol edildi: 1 yeni kayıt/)).toBeVisible()
})
