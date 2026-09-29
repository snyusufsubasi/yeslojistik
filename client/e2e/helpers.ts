import { expect, type Locator, type Page } from '@playwright/test'

export const ADMIN = { email: process.env.E2E_EMAIL ?? 'admin@yeslojistik.com', password: process.env.E2E_PASSWORD ?? 'Admin123!' }

export async function login(page: Page) {
  await page.goto('/giris')
  await page.getByLabel('E-posta').fill(ADMIN.email)
  await page.getByLabel('Şifre', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page.getByRole('heading', { name: /Günaydın|İyi (günler|akşamlar|geceler)/ })).toBeVisible()
}

export const unique = () => Date.now().toString().slice(-6)

/**
 * PDF düğmesine basar; açılan sekmenin PDF adresini istediğini ve adresin PDF döndürdüğünü doğrular.
 * (Başsız Chrome'da PDF görüntüleyici olmadığı için sekme dosyayı indirir ve adresi about:blank kalabilir;
 * bu yüzden sekmenin adresine değil yaptığı isteğe bakılır.)
 */
export async function expectPdfOpens(page: Page, click: () => Promise<void>, url: RegExp) {
  const [request] = await Promise.all([page.context().waitForEvent('request', (r) => url.test(r.url())), click()])
  const res = await page.request.get(request.url())
  expect(res.headers()['content-type']).toBe('application/pdf')
  for (const p of page.context().pages()) if (p !== page) await p.close()
}

/** Aranabilir seçim kutusunda (SearchSelect) seçim yapar: adıyla ya da sıradaki yerine göre (1 = ilk seçenek). */
export async function pick(input: Locator, option: string | { index: number }) {
  await input.click()
  const list = input.page().locator(`[id="${await input.getAttribute('aria-controls')}"]`)
  if (typeof option === 'string') {
    await input.fill(option)
    await list.getByRole('option', { name: option, exact: true }).click()
  } else {
    await list.getByRole('option').nth(option.index - 1).click()
  }
}
