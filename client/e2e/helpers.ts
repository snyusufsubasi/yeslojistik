import { expect, type Page } from '@playwright/test'

export const ADMIN = { email: process.env.E2E_EMAIL ?? 'admin@yeslojistik.com', password: process.env.E2E_PASSWORD ?? 'Admin123!' }

export async function login(page: Page) {
  await page.goto('/giris')
  await page.getByLabel('E-posta').fill(ADMIN.email)
  await page.getByLabel('Şifre', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page.getByRole('heading', { name: /Hoş Geldiniz/ })).toBeVisible()
}

export const unique = () => Date.now().toString().slice(-6)
