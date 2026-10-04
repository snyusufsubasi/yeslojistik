import { createHmac } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { ADMIN, login, unique } from './helpers'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Doğrulayıcı uygulamanın yaptığı iş: RFC 6238 (SHA1, 6 hane, 30 sn). offset: sonraki adım için 1. */
function totp(secretBase32: string, offset = 0): string {
  let bits = ''
  for (const c of secretBase32.replace(/[\s=-]/g, '').toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, '0')
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offset))
  const h = createHmac('sha1', key).update(counter).digest()
  const o = h[h.length - 1] & 0x0f
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

async function openSettingsTab(page: Page, tab: string) {
  await page.getByRole('link', { name: 'Ayarlar', exact: true }).click()
  await page.getByRole('button', { name: tab, exact: true }).click()
}

test('Veri ve hesap: tüm veriler ZIP olarak iner, kapatma talebi firma adı ister ve veri silmez', async ({ page }) => {
  await login(page)
  await openSettingsTab(page, 'Veri ve hesap')

  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tüm verilerimi indir' }).click()])
  expect(dl.suggestedFilename()).toMatch(/^yeslojistik-verilerim-.*\.zip$/)
  await expect(page.getByText('Verileriniz indirildi.')).toBeVisible()

  // Yanlış firma adı reddedilir.
  await page.getByLabel('Onaylamak için firma adını yazın').fill('Başka Firma')
  await page.getByRole('button', { name: 'Hesabı kapatma talebi gönder' }).click()
  await expect(page.getByRole('alert')).toContainText('Firma adı eşleşmiyor')

  // Doğru adla talep alınır; veriler yerinde kalır; talep geri çekilebilir.
  const company = (await page.getByText(/^Firma adı: /).innerText()).replace('Firma adı: ', '')
  await page.getByLabel('Onaylamak için firma adını yazın').fill(company)
  await page.getByRole('button', { name: 'Hesabı kapatma talebi gönder' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Talebiniz alındı, 30 gün içinde verileriniz silinir' })).toBeVisible()
  const customers = await page.request.get('/api/customers?pageSize=1')
  expect(customers.ok()).toBeTruthy()
  await page.getByRole('button', { name: 'Talebi geri çek' }).click()
  await expect(page.getByLabel('Onaylamak için firma adını yazın')).toBeVisible()
})

test('İki adımlı doğrulama: arayüzden açılır, girişte kod istenir, kurtarma kodları gösterilir', async ({ page, context }) => {
  const email = `iki${unique()}@test.local`
  const password = 'Sifre1234'
  await login(page)
  const created = await page.request.post('/api/users', { data: { fullName: 'İki Adım Deneme', email, role: 'Admin', isActive: true, password } })
  expect(created.ok()).toBeTruthy()
  await page.request.post('/api/auth/logout')
  await context.clearCookies()

  const signIn = async () => {
    await page.goto('/giris')
    await page.getByLabel('E-posta').fill(email)
    await page.getByLabel('Şifre', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Giriş Yap' }).click()
  }

  await signIn()
  await expect(page.getByRole('heading', { name: /Günaydın|İyi (günler|akşamlar|geceler)/ })).toBeVisible()
  await openSettingsTab(page, 'Güvenlik')
  await page.getByRole('button', { name: 'İki adımlı doğrulamayı aç' }).click()
  await expect(page.getByAltText('Doğrulama uygulaması için QR kod')).toBeVisible()
  const secret = (await page.getByLabel('Elle giriş anahtarı').innerText()).replace(/\s/g, '')

  // Yanlış kod reddedilir, doğrusu açar.
  await page.getByLabel('Uygulamadaki 6 haneli kod').fill('000000')
  await page.getByRole('button', { name: 'Doğrula ve aç' }).click()
  await expect(page.getByRole('alert')).toContainText('Kod hatalı')
  await page.getByLabel('Uygulamadaki 6 haneli kod').fill(totp(secret))
  await page.getByRole('button', { name: 'Doğrula ve aç' }).click()

  const list = page.getByRole('list', { name: 'Kurtarma kodları' })
  await expect(list.getByRole('listitem')).toHaveCount(10)
  const recovery = (await list.getByRole('listitem').first().innerText()).trim()
  await expect(page.getByRole('button', { name: 'Kopyala' })).toBeVisible()
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'İndir' }).click()])
  expect(file.suggestedFilename()).toBe('kurtarma-kodlari.txt')
  await expect(page.getByRole('button', { name: 'Bitti' })).toBeDisabled()
  await page.getByLabel('Kodları güvenli bir yere kaydettim').check()
  await page.getByRole('button', { name: 'Bitti' }).click()
  await expect(page.getByText('Açık', { exact: true })).toBeVisible()

  // Çıkış, yeniden giriş: şifreden sonra kod istenir.
  await page.request.post('/api/auth/logout')
  await context.clearCookies()
  await signIn()
  await expect(page.getByLabel('Doğrulama kodu')).toBeVisible()
  await page.getByLabel('Doğrulama kodu').fill('111111')
  await page.getByRole('button', { name: 'Doğrula' }).click()
  await expect(page.getByRole('alert')).toContainText('Kod hatalı')
  // Açarken kullanılan adım yeniden kullanılamaz; bir sonraki adımın kodu kabul edilir.
  await page.getByLabel('Doğrulama kodu').fill(totp(secret, 1))
  await page.getByRole('button', { name: 'Doğrula' }).click()
  await expect(page.getByRole('heading', { name: /Günaydın|İyi (günler|akşamlar|geceler)/ })).toBeVisible()

  // Kurtarma koduyla da girilir (bir kez).
  await page.request.post('/api/auth/logout')
  await context.clearCookies()
  await signIn()
  await page.getByLabel('Doğrulama kodu').fill(recovery)
  await page.getByRole('button', { name: 'Doğrula' }).click()
  await expect(page.getByRole('heading', { name: /Günaydın|İyi (günler|akşamlar|geceler)/ })).toBeVisible()

  // Temizlik: yönetici hesabıyla bu deneme kullanıcısını sil.
  await page.request.post('/api/auth/logout')
  await context.clearCookies()
  await login(page)
  const users = await (await page.request.get('/api/users')).json() as { id: number; email: string }[]
  const mine = users.find((u) => u.email === email)
  if (mine) await page.request.delete(`/api/users/${mine.id}`)
  expect(ADMIN.email).toBeTruthy()
})
