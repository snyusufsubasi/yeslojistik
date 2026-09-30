import { expect, test } from '@playwright/test'
import { expectPdfOpens, login, unique, pick } from './helpers'

test('müşteri → araç → şoför → sefer → fatura → PDF → kısmi tahsilat → bakiye', async ({ page }) => {
  const id = unique()
  const customer = `E2E Mobilya ${id}`
  const plate = `34 E ${id.slice(-4)}`

  await login(page)
  const receivableBefore = await page.getByRole('button', { name: /Tahsilat Bekleyen/ }).innerText()

  // Müşteri
  await page.getByRole('link', { name: 'Müşteriler / Cari', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Müşteri' }).click()
  const custDialog = page.getByRole('dialog', { name: 'Yeni Müşteri' })
  await custDialog.getByLabel('Ünvan').fill(customer)
  await custDialog.getByLabel('VKN / TCKN').fill('123')
  await custDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(custDialog.getByText('VKN 10, TCKN 11 haneli olmalı.')).toBeVisible()
  await custDialog.getByLabel('VKN / TCKN').fill('1234567890')
  await custDialog.getByLabel('Telefon').fill('02165554433')
  await custDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('heading', { name: customer })).toBeVisible()

  // Şoför
  await page.getByRole('link', { name: 'Şoförler', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Şoför' }).click()
  const drvDialog = page.getByRole('dialog', { name: 'Yeni Şoför' })
  await drvDialog.getByLabel('Ad Soyad').fill(`E2E Şoför ${id}`)
  await drvDialog.getByLabel('Telefon').fill('05321234567')
  await drvDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Şoför eklendi.')).toBeVisible()

  // Araç
  await page.getByRole('link', { name: 'Araçlar', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Araç' }).click()
  const vehDialog = page.getByRole('dialog', { name: 'Yeni Araç' })
  await vehDialog.getByLabel(/^Plaka/).fill(plate)
  await vehDialog.getByLabel('Araç Tipi').fill('Kamyon')
  await pick(vehDialog.locator('input[name=defaultDriverId]'), `E2E Şoför ${id}`)
  await vehDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Araç eklendi.')).toBeVisible()

  // Sefer
  await page.getByRole('link', { name: 'Seferler', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Sefer' }).click()
  const tripDialog = page.getByRole('dialog', { name: 'Sefer Oluştur' })
  await pick(tripDialog.locator('input[name=customerId]'), customer)
  await pick(tripDialog.locator('input[name=vehicleId]'), `${plate} - Kamyon`)
  await expect(tripDialog.locator('input[name=driverId]')).not.toHaveValue('')
  await tripDialog.getByLabel('Yükleme Adresi').fill('İstanbul / Sultanbeyli')
  await tripDialog.getByLabel('Teslimat Adresi').fill('İzmir / Balçova')
  await tripDialog.getByLabel('Araç Maliyeti (TL)').fill('18000')
  await tripDialog.getByLabel('Müşteri Satış Fiyatı (TL)').fill('25000')
  await expect(tripDialog.getByText('7.000 TL')).toBeVisible()
  await tripDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Sefer oluşturuldu.')).toBeVisible()

  // Durumları ilerlet: Yüklendi → Yola Çıktı → Teslim Edildi
  await page.getByPlaceholder('Müşteri, plaka, şoför, adres...').fill(customer)
  const row = page.getByRole('row', { name: new RegExp(customer) })
  await expect(row).toHaveCount(1)
  for (const action of ['Yüklendi', 'Yola Çıktı', 'Teslim Edildi']) {
    await row.getByRole('button', { name: action }).click()
    await expect(page.getByText('Sefer durumu güncellendi.').first()).toBeVisible()
  }
  await expect(row.getByText('Teslim Edildi')).toBeVisible()

  // Fatura
  await page.getByRole('link', { name: 'Faturalar' }).click()
  await page.getByRole('button', { name: 'Yeni Fatura' }).click()
  await expect(page.getByRole('heading', { name: 'Yeni Fatura' })).toBeVisible()
  await pick(page.getByRole('combobox').first(), customer)
  await expect(page.getByRole('checkbox', { name: /Sefer \d+/ })).toBeChecked()
  // Varsayılan: %20 KDV, 2/10 tevkifat → 25.000 + 5.000 − 1.000 = 29.000
  await expect(page.getByText('29.000,00 TL')).toBeVisible()
  await page.getByRole('button', { name: 'Faturayı Kes' }).click()
  const invDialog = page.getByRole('dialog', { name: /Fatura F-\d{6}/ })
  await expect(invDialog).toBeVisible()
  await expect(invDialog.getByText('Açık', { exact: true })).toBeVisible()

  // PDF yeni sekmede açılır
  await expectPdfOpens(page, () => invDialog.getByRole('button', { name: 'PDF' }).click(), /\/api\/invoices\/\d+\/pdf$/)

  // Kısmi tahsilat
  await invDialog.getByRole('button', { name: 'Tahsilat Ekle' }).click()
  const payDialog = page.getByRole('dialog', { name: 'Tahsilat Ekle' })
  await payDialog.getByLabel('Tutar (TL)').fill('10000')
  await payDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Tahsilat kaydedildi.')).toBeVisible()
  await expect(invDialog.getByText('Kısmi Ödendi', { exact: true })).toBeVisible()
  await expect(invDialog.getByText('19.000,00 TL')).toBeVisible()
  await invDialog.getByRole('button', { name: 'Kapat' }).click()

  // Cari kartı
  await page.getByRole('link', { name: 'Müşteriler / Cari', exact: true }).click()
  await page.getByPlaceholder('Ünvan, VKN, telefon...').fill(customer)
  await page.getByRole('row', { name: new RegExp(customer) }).click()
  await expect(page.getByText('29.000,00 TL').first()).toBeVisible()
  await expect(page.getByText('10.000,00 TL').first()).toBeVisible()
  await expect(page.getByText('19.000,00 TL').first()).toBeVisible()

  // Dashboard'daki tahsilat bekleyen tutarı değişmiş olmalı
  await page.getByRole('link', { name: 'Ana Sayfa' }).click()
  await expect(page.getByRole('button', { name: /Tahsilat Bekleyen/ })).not.toHaveText(receivableBefore)
})

test('raporlar ve Excel dışa aktarma', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Raporlar' }).click()
  await expect(page.getByText('Sefer cirosu', { exact: true })).toBeVisible()
  for (const tab of ['Sefer Kârlılığı', 'Araç Bazlı', 'Şoför Bazlı', 'Alacak Yaşlandırma', 'Gider Dağılımı']) {
    await page.getByRole('button', { name: tab }).click()
    await expect(page.locator('table').first()).toBeVisible()
  }
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: "Excel'e Aktar" }).click()
  expect((await dl).suggestedFilename()).toMatch(/\.xlsx$/)
})

test('bildirimler açılır', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Bildirimler' }).click()
  await expect(page.getByText('Bildirimler', { exact: true })).toBeVisible()
})

test('var olan seferin formu araç ve şoförü dolu açılır', async ({ page }) => {
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('row').nth(1).click()
  const dialog = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  for (const name of ['customerId', 'vehicleId', 'driverId']) {
    await expect(dialog.locator(`input[name=${name}]`)).not.toHaveValue('')
  }
})

test('yardım sayfası ve kontrol listesi bağlantıları', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Yardım' }).click()
  await expect(page.getByRole('heading', { name: 'Yardım' })).toBeVisible()
  await page.getByText('Sık sorulanlar').click()
  await expect(page.getByText('Şifremi unuttum.')).toBeVisible()
  await page.getByRole('link', { name: 'Seferler → Yeni Sefer' }).click()
  await expect(page.getByRole('dialog', { name: 'Sefer Oluştur' })).toBeVisible()
})

test('sefer kopyalanır, sevk belgesi ve hesap ekstresi PDF açılır', async ({ page }) => {
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('row').nth(1).click()
  const edit = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  const from = await edit.getByLabel('Yükleme Adresi').inputValue()

  await expectPdfOpens(page, () => edit.getByRole('button', { name: 'Sevk Belgesi' }).click(), /\/api\/trips\/\d+\/waybill$/)

  await edit.getByRole('button', { name: 'Kopyala' }).click()
  const copy = page.getByRole('dialog', { name: 'Sefer Oluştur (kopya)' })
  await expect(copy.getByLabel('Yükleme Adresi')).toHaveValue(from)
  await expect(copy.locator('input[name=customerId]')).not.toHaveValue('')
  await copy.getByRole('button', { name: 'Vazgeç' }).click()

  await page.goto('/musteriler')
  await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Hesap Ekstresi' }).click()
  const dlg = page.getByRole('dialog', { name: /Hesap Ekstresi/ })
  await expectPdfOpens(page, () => dlg.getByRole('button', { name: 'PDF Aç' }).click(), /\/api\/customers\/\d+\/statement\?from=/)
})

test('yakıt gideri litre ve km ile girilir, yakıt raporunda görünür', async ({ page }) => {
  await login(page)
  await page.goto('/giderler')
  await page.getByRole('button', { name: 'Gider Ekle' }).click()
  const dlg = page.getByRole('dialog', { name: 'Gider Ekle' })
  await dlg.getByLabel('Tutar (TL)').fill('4450')
  await dlg.getByLabel('Litre').fill('100')
  await expect(dlg.getByText('Litre fiyatı: 44,5 TL')).toBeVisible()
  await dlg.getByRole('radio', { name: 'Şoför Avansı' }).click()
  await expect(dlg.getByLabel('Litre')).toHaveCount(0)
  await dlg.getByRole('button', { name: 'Kaydet' }).click()
  await expect(dlg.getByText('Avans için şoför seçin.')).toBeVisible()
  await dlg.getByRole('radio', { name: 'Yakıt' }).click()
  await dlg.getByLabel('Litre').fill('100')
  await pick(dlg.locator('input[name=vehicleId]'), { index: 1 })
  await dlg.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Gider eklendi.')).toBeVisible()

  await page.goto('/raporlar')
  await page.getByRole('button', { name: 'Yakıt' }).click()
  await expect(page.getByText(/Filo ortalaması/)).toBeVisible()
})

test('işlem geçmişi yapılan değişikliği gösterir', async ({ page }) => {
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('row').nth(1).click()
  const dlg = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  const desc = dlg.getByLabel('Açıklama')
  const note = `Geçmiş testi ${Date.now()}`
  await desc.fill(note)
  await dlg.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Sefer güncellendi.')).toBeVisible()

  await page.goto('/ayarlar?tab=audit')
  const row = page.getByRole('row').filter({ hasText: note })
  await expect(row.getByText('Değiştirdi')).toBeVisible()
  await expect(row.getByText('Yönetici')).toBeVisible()
})

test('yedek kartı depolama durumunu gösterir ve yedek iner', async ({ page }) => {
  await login(page)
  await page.goto('/ayarlar?tab=data')
  await expect(page.getByText('Yedekler ve depolama')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Veritabanı doluluğu' })).toBeVisible()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Dosyasız yedeği indir' }).click()])
  expect(dl.suggestedFilename()).toMatch(/^yeslojistik-\d{8}-\d{4}-dosyasiz\.dump$/)
  await dl.path() // indirme bitsin
  await page.reload()
  await expect(page.getByText(/Son yedek: \d/)).toBeVisible()
})

test('tedarikçi → kiralık araç → taşeronlu sefer; zaman çizelgesi ve canlıya geçiş kartı', async ({ page }) => {
  const u = unique()
  await login(page)
  await page.getByRole('link', { name: 'Tedarikçiler', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Tedarikçi' }).click()
  const sd = page.getByRole('dialog', { name: 'Yeni Tedarikçi' })
  await sd.getByLabel(/^Ünvan/).fill(`E2E Nakliyat ${u}`)
  await sd.getByLabel('IBAN').fill('TR33 0006 1005 1978 6457 8413 26')
  await sd.getByRole('button', { name: /Vergi, adres/ }).click()
  await pick(sd.locator('input[name="city"]'), 'Kocaeli')
  await sd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('heading', { name: `E2E Nakliyat ${u}` })).toBeVisible()

  await page.getByRole('link', { name: 'Araçlar', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Araç' }).click()
  const vd = page.getByRole('dialog', { name: 'Yeni Araç' })
  const plate = `41 E ${u.slice(-4)}`
  await vd.getByLabel(/^Plaka/).fill(plate)
  await vd.getByLabel(/^Araç Tipi/).fill('Tır')
  await vd.getByRole('radio', { name: /Kiralık/ }).click()
  await vd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(vd.getByText('Kiralık araç için araç sahibini seçin.')).toBeVisible()
  await pick(vd.locator('input[name=supplierId]'), `E2E Nakliyat ${u}`)
  await vd.getByRole('button', { name: /Marka, dorse/ }).click()
  await vd.getByLabel('Dorse Plakası').fill('41 DRS 41')
  await vd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Araç eklendi.')).toBeVisible()

  await page.getByRole('link', { name: 'Seferler', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Sefer' }).click()
  const td = page.getByRole('dialog', { name: 'Sefer Oluştur' })
  await pick(td.locator('input[name=customerId]'), 'Yıldız Mobilya')
  await pick(td.locator('input[name=vehicleId]'), `${plate} - Tır (Kiralık: E2E Nakliyat ${u})`)
  await expect(td.getByText('Taşeron (kiralık araç)')).toBeVisible()
  // Listede olmayan şoför, yazılan adla aynı kutudan eklenir.
  await td.locator('input[name=driverId]').fill(`Taşeron Şoför ${u}`)
  await page.getByRole('option', { name: /Yeni şoför olarak ekle/ }).click()
  const qd = page.getByRole('dialog', { name: 'Hızlı şoför ekle' })
  await qd.getByLabel(/^Ad Soyad/).fill(`Taşeron Şoför ${u}`)
  await qd.getByRole('button', { name: 'Ekle' }).click()
  await expect(page.getByText('Şoför eklendi.')).toBeVisible()
  await td.getByLabel('Müşteri Referans No').fill(`PO-${u}`)
  await pick(td.locator('input[name=loadingCity]'), 'Kocaeli')
  await td.getByLabel(/^Yükleme Adresi/).fill('Gebze OSB')
  await pick(td.locator('input[name=deliveryCity]'), 'İzmir')
  await td.getByLabel(/^Teslimat Adresi/).fill('Kemalpaşa')
  await td.getByLabel('Yük Cinsi').fill('Otomotiv parçası')
  await td.getByLabel('Taşerona Ödenecek (TL)').fill('15000')
  await td.getByLabel('Müşteri Satış Fiyatı (TL)').fill('21000')
  await td.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Sefer oluşturuldu.')).toBeVisible()

  await page.getByPlaceholder('Müşteri, plaka, şoför, adres...').fill(`PO-${u}`)
  const row = page.getByRole('row', { name: new RegExp(`PO-${u}`) })
  await expect(row.getByText('Kiralık')).toBeVisible()
  await row.click()
  const ed = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  await ed.getByRole('button', { name: 'Yüklendi yap' }).click()
  await expect(page.getByText('Sefer durumu güncellendi.')).toBeVisible()
  await row.click()
  await ed.getByRole('button', { name: 'Geçmiş' }).click()
  const timeline = ed.getByRole('list', { name: 'Durum geçmişi' })
  await expect(timeline.getByText('Yüklendi', { exact: true })).toBeVisible()
  await expect(timeline.getByText('Planlandı', { exact: true })).toBeVisible()
  await ed.getByRole('button', { name: 'Kapat', exact: true }).last().click()

  // Taşeron borcu: yüklenen seferin maliyeti
  await page.getByRole('link', { name: 'Tedarikçiler', exact: true }).click()
  await page.getByPlaceholder('Ünvan, VKN, telefon...').fill(`E2E Nakliyat ${u}`)
  await expect(page.getByRole('row', { name: new RegExp(`E2E Nakliyat ${u}`) })).toContainText('15.000')

  // Ödeme yap → bakiye düşer → ekstre açılır
  await page.getByRole('row', { name: new RegExp(`E2E Nakliyat ${u}`) }).click()
  await expect(page.getByText('Kalan Borcumuz').locator('..')).toContainText('15.000,00')
  await page.getByRole('button', { name: 'Ödeme Yap' }).click()
  const pd = page.getByRole('dialog', { name: 'Ödeme Yap' })
  await pd.getByLabel(/^Tutar/).fill('6000')
  await pd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Ödeme kaydedildi.')).toBeVisible()
  await expect(page.getByText('Kalan Borcumuz').locator('..')).toContainText('9.000,00')
  await expectPdfOpens(page, () => page.getByRole('button', { name: 'Hesap Ekstresi' }).click(), /\/api\/suppliers\/\d+\/statement$/)
  await page.getByRole('link', { name: 'Ödemeler', exact: true }).click()
  await expect(page.getByRole('row', { name: new RegExp(`E2E Nakliyat ${u}`) }).first()).toContainText('6.000')

  await page.goto('/ayarlar?tab=data')
  await expect(page.getByText(/Canlıya geçiş · \d\/7/)).toBeVisible()
})

test('e-Fatura açılır, kesilen fatura e-Arşiv numarası alır, XML ve muhasebe aktarımı iner', async ({ page }) => {
  await login(page)
  await page.goto('/ayarlar')
  await page.getByLabel('e-Fatura açık').check()
  await page.getByRole('button', { name: 'Kaydet' }).first().click()
  await expect(page.getByText('Firma bilgileri kaydedildi.')).toBeVisible()

  // e-Fatura mükellefi olmayan müşteri → e-Arşiv (YEA serisi)
  await page.goto('/faturalar/yeni')
  await expect(page.getByRole('heading', { name: 'Yeni Fatura' })).toBeVisible()
  await pick(page.getByRole('combobox').first(), 'ABC İnşaat')
  await page.getByRole('button', { name: 'Satır Ekle' }).click()
  await page.getByLabel('Satır 1 açıklama').fill('Bekleme bedeli')
  await page.getByLabel('Satır 1 tutar').fill('1500')
  await page.getByRole('button', { name: 'Faturayı Kes' }).click()
  const dlg = page.getByRole('dialog', { name: /Fatura F-\d{6}/ })
  await expect(dlg.getByText(/^YEA\d{13}$/)).toBeVisible()
  await expect(dlg.getByText('Gönderilmeye hazır')).toBeVisible()
  const [xml] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'XML indir' }).click()])
  expect(xml.suggestedFilename()).toMatch(/^YEA\d{13}\.xml$/)
  await dlg.getByRole('button', { name: 'Gönderildi olarak işaretle' }).click()
  await expect(dlg.getByText('Gönderildi', { exact: true })).toBeVisible()
  await dlg.getByRole('button', { name: 'Kapat', exact: true }).last().click()

  await page.goto('/raporlar')
  await page.getByRole('button', { name: 'Muhasebe Aktarımı' }).click()
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: "Muhasebe Excel'i" }).click()])
  expect(xlsx.suggestedFilename()).toMatch(/^muhasebe-.*\.xlsx$/)

  // Sonraki testler etkilenmesin: e-Fatura'yı kapat.
  await page.goto('/ayarlar')
  await page.getByLabel('e-Fatura açık').uncheck()
  await page.getByRole('button', { name: 'Kaydet' }).first().click()
  await expect(page.getByText('Firma bilgileri kaydedildi.')).toBeVisible()
})

test('şoför masrafı reddedilir; araç belgeleri, bakım kaydı ve şoför hesabı', async ({ page, playwright }) => {
  const u = unique()
  // Şoför uygulamasından (API) onay bekleyen bir masraf gelir.
  const office = await playwright.request.newContext({ baseURL: 'http://localhost:5080' })
  expect((await office.post('/api/auth/login', { data: { email: 'admin@yeslojistik.com', password: 'Admin123!' } })).ok()).toBeTruthy()
  const driver = (await (await office.get('/api/drivers?search=Mehmet')).json()).items[0]
  const vehicle = (await (await office.get('/api/vehicles?search=34 VES 01')).json()).items[0]
  const customer = (await (await office.get('/api/customers?search=Martur')).json()).items[0]
  const trip = await (await office.post('/api/trips', { data: {
    customerId: customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'Bursa', deliveryAddress: `Onay Deposu ${u}`,
    loadingDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }), vehicleCost: 1000, salePrice: 2000 } })).json()
  await office.dispose()
  const mobile = await playwright.request.newContext({ baseURL: 'http://localhost:5080' })
  const token = (await (await mobile.post('/api/auth/token', { data: { email: 'sofor@yeslojistik.com', password: 'Sofor123!' } })).json()).accessToken
  expect((await mobile.post(`/api/driver/trips/${trip.id}/expenses`, { data: { category: 'Toll', amount: 275, description: `Köprü ${u}` },
    headers: { Authorization: `Bearer ${token}` } })).ok()).toBeTruthy()
  await mobile.dispose()

  await login(page)
  await expect(page.getByText(/şoför masrafı onay bekliyor/)).toBeVisible()
  await page.getByText(/şoför masrafı onay bekliyor/).click()
  await expect(page).toHaveURL(/giderler\?onay=Pending/)
  const row = page.getByRole('row').filter({ hasText: `Köprü ${u}` })
  await row.getByRole('button', { name: 'Reddet' }).click()
  const rd = page.getByRole('dialog', { name: 'Masrafı reddet' })
  await rd.getByLabel(/Gerekçe/).fill('Fiş okunmuyor')
  await rd.getByRole('button', { name: 'Reddet' }).click()
  await expect(page.getByText('Masraf reddedildi; şoföre bildirildi.')).toBeVisible()
  await page.getByLabel('Onay durumu').selectOption('Rejected')
  await expect(page.getByRole('row').filter({ hasText: `Köprü ${u}` }).getByText('Fiş okunmuyor')).toBeVisible()

  // Araç kartı: belgeler (demo kasko) ve bakım kaydı
  await page.getByRole('link', { name: 'Araçlar', exact: true }).click()
  // Önceki sayfadaki gider satırı da plakayı içerir: araç listesi yüklenmeden tıklanmasın.
  await expect(page.getByRole('heading', { name: 'Araçlar', exact: true })).toBeVisible()
  await page.getByRole('row').filter({ hasText: '34 VES 01' }).first().click()
  const vd = page.getByRole('dialog', { name: /Araç: 34 VES 01/ })
  await vd.getByRole('button', { name: 'Belgeler' }).click()
  await expect(vd.getByRole('cell', { name: 'Kasko', exact: true })).toBeVisible()
  await expect(vd.getByText(/gün kaldı/).first()).toBeVisible()
  await vd.getByRole('button', { name: 'Bakım' }).click()
  await vd.getByRole('button', { name: 'Bakım Ekle' }).click()
  const md = page.getByRole('dialog', { name: 'Bakım Ekle' })
  await md.getByLabel('Yapılan işlem').fill(`Yağ değişimi ${u}`)
  await md.getByLabel(/Tutar/).fill('4500')
  await md.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Bakım kaydedildi.')).toBeVisible()
  await expect(vd.getByText(`Yağ değişimi ${u}`)).toBeVisible()
  await vd.getByRole('button', { name: 'Kapat', exact: true }).last().click()

  // Şoför kartı → Hesap
  await page.getByRole('link', { name: 'Şoförler', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Şoförler', exact: true })).toBeVisible()
  await page.getByRole('row').filter({ hasText: 'Mehmet Yılmaz' }).first().click()
  const dd = page.getByRole('dialog', { name: 'Mehmet Yılmaz' })
  await dd.getByRole('button', { name: 'Hesap' }).click()
  await expect(dd.getByText('Onay bekleyen masraf')).toBeVisible()
  await expect(dd.getByText('Avans').first()).toBeVisible()
  await expect(dd.getByText('Reddedildi').first()).toBeVisible()
})

test('çek ciro edilir, kasa/banka virmanı ve nakit akışı', async ({ page }) => {
  const u = unique()
  await login(page)
  await expect(page.getByText('Nakit Akışı: Önümüzdeki 30 Gün')).toBeVisible()

  // Yeni çek: tahsilat olarak girilir, portföye düşer.
  await page.getByRole('link', { name: 'Tahsilatlar', exact: true }).click()
  await page.getByRole('button', { name: /Tahsilat Ekle/ }).first().click()
  const pd = page.getByRole('dialog', { name: 'Tahsilat Ekle' })
  await pick(pd.locator('input[name=customerId]'), { index: 1 })
  await pd.getByLabel(/^Tutar/).fill('3250')
  await pd.getByRole('radio', { name: 'Çek' }).click()
  await pd.getByLabel('Çek no').fill(`E2E${u}`)
  await pd.getByLabel('Banka').fill('Akbank')
  await pd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(pd.getByText('Çek/senet için vade tarihini girin.')).toBeVisible()
  await pd.getByLabel(/Vade tarihi/).fill(new Date(Date.now() + 3 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }))
  await pd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Tahsilat kaydedildi.')).toBeVisible()

  await page.getByRole('link', { name: 'Çek / Senet', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: `E2E${u}` })
  await expect(row.getByText('Portföyde')).toBeVisible()
  await row.getByRole('button', { name: 'Ciro et' }).click()
  const cd = page.getByRole('dialog', { name: /Ciro et/ })
  await cd.locator('select').first().selectOption({ index: 1 })
  await cd.getByRole('button', { name: 'Ciro et' }).click()
  await expect(page.getByText(/Ciro edildi” olarak işaretlendi/)).toBeVisible()
  await page.getByLabel('Durum').selectOption('Endorsed')
  await expect(page.getByRole('row').filter({ hasText: `E2E${u}` }).getByText('Ciro edildi')).toBeVisible()

  // Kasa / Banka: demo hesaplar ve virman
  await page.getByRole('link', { name: 'Kasa / Banka', exact: true }).click()
  await expect(page.getByRole('button', { name: /Merkez Kasa/ })).toBeVisible()
  await page.getByRole('button', { name: 'Virman', exact: true }).click()
  const vd = page.getByRole('dialog', { name: /Virman/ })
  await vd.getByLabel(/^Tutar/).fill('1000')
  await vd.getByLabel('Not').fill(`Bankaya yatırıldı ${u}`)
  await vd.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Virman kaydedildi.')).toBeVisible()
  await expect(page.getByText(`Bankaya yatırıldı ${u}`).first()).toBeVisible()
})

test('genel arama (Ctrl+K) ve kârlılık raporları', async ({ page }) => {
  await login(page)
  await page.keyboard.press('Control+k')
  const sd = page.getByRole('dialog', { name: 'Ara' })
  await sd.getByLabel('Arama').fill('34 VES 01')
  await sd.getByRole('option').filter({ hasText: 'Araç' }).first().click()
  await expect(page.getByRole('dialog', { name: /Araç: 34 VES 01/ })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Raporlar', exact: true }).click()
  await page.getByRole('button', { name: 'Müşteri Kârlılığı' }).click()
  await expect(page.getByRole('columnheader', { name: 'Marj' })).toBeVisible()
  await expect(page.getByRole('row').nth(1)).toBeVisible()
  await page.getByRole('button', { name: 'Güzergâh' }).click()
  await expect(page.getByRole('row').filter({ hasText: '→' }).first()).toBeVisible()
})

test('sefer panosu: sütunlar ve tek tıkla durum ilerletme', async ({ page }) => {
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('tab', { name: 'Pano' }).click()
  for (const col of ['Planlandı', 'Yüklendi', 'Yolda', 'Teslim Edildi']) await expect(page.getByRole('region', { name: col })).toBeVisible()
  const planned = page.getByRole('region', { name: 'Planlandı' })
  const count = planned.locator('header span').last()
  await expect(planned.getByRole('article').first()).toBeVisible()
  const before = Number(await count.textContent())
  await planned.getByRole('article').first().getByRole('button', { name: /Yüklendi yap/ }).click()
  await expect(page.getByText('Sefer durumu güncellendi.')).toBeVisible()
  await expect(count).toHaveText(String(before - 1))
  // Tercih hatırlanır: sayfa yenilenince pano açık gelir.
  await page.reload()
  await expect(page.getByRole('region', { name: 'Yolda' })).toBeVisible()
})

test('iş talebi açılır, sefere çevrilir ve listede "Sevk edildi" görünür', async ({ page }) => {
  const id = unique()
  await login(page)
  await page.goto('/is-talepleri')
  await page.getByRole('button', { name: 'Yeni İş Talebi' }).click()
  const dialog = page.getByRole('dialog', { name: 'Yeni İş Talebi' })
  await pick(dialog.getByRole('combobox', { name: 'Müşteri' }), { index: 1 })
  await dialog.getByLabel('Yükleme Yeri').fill(`Tuzla Depo ${id}`)
  await dialog.getByLabel('İndirme Yeri').fill('Sincan OSB')
  await dialog.getByLabel('Müşteri Fiyatı (TL)').fill('18000')
  await dialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('İş talebi oluşturuldu.')).toBeVisible()

  const row = page.getByRole('row', { name: new RegExp(`Tuzla Depo ${id}`) })
  await row.getByRole('button', { name: 'Sevk Et' }).click()
  const trip = page.getByRole('dialog', { name: /Sefer/ })
  await expect(trip.locator('input[name=loadingAddress]')).toHaveValue(`Tuzla Depo ${id}`)
  await pick(trip.locator('input[name=vehicleId]'), { index: 1 })
  if (!(await trip.locator('input[name=driverId]').inputValue())) await pick(trip.locator('input[name=driverId]'), { index: 1 })
  await trip.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Sefer oluşturuldu.')).toBeVisible()

  await page.goto('/is-talepleri')
  await page.getByRole('combobox', { name: 'Durum' }).selectOption({ label: 'Sevk edildi' })
  await expect(page.getByRole('row', { name: new RegExp(`Tuzla Depo ${id}`) }).getByText('Sevk edildi')).toBeVisible()
  // Sevk edilen talep salt okunur açılır; bilgiler kaybolmaz.
  await page.getByRole('row', { name: new RegExp(`Tuzla Depo ${id}`) }).getByRole('button', { name: 'Görüntüle' }).click()
  const view = page.getByRole('dialog', { name: /İş Talebi · Sevk edildi/ })
  await expect(view.getByLabel('Yükleme Yeri')).toHaveValue(`Tuzla Depo ${id}`)
  await expect(view.getByLabel('Yükleme Yeri')).toBeDisabled()
})
