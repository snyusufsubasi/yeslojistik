import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SOURCES, assertComplete } from './extract.mjs'

test('unused archive and shipment summary failures do not block mirror', () => {
  const rows = Object.keys(SOURCES).map((name) => ({ name, file: `${name}.html`, bytes: 100 }))
  for (const row of rows) {
    if (['firmalar-arsiv', 'tedarikciler-arsiv', 'sevkiyat-ozet'].includes(row.name)) row.error = 'HTTP 500'
  }
  assert.doesNotThrow(() => assertComplete(rows))
})

const complete = () => Object.keys(SOURCES).map((name) => ({ name, file: `${name}.html`, bytes: 100 }))
test('complete extraction permits continuation', () => assert.doesNotThrow(() => assertComplete(complete())))
test('failed, skipped, missing, duplicate and empty exports stop extraction', () => {
  for (const change of [
    (rows) => { rows[0].error = 'HTTP 500' },
    (rows) => { rows[0].skipped = 'unsafe' },
    (rows) => { rows.pop() },
    (rows) => { rows.push(rows[0]) },
    (rows) => { rows[0].bytes = 0 },
  ]) {
    const rows = complete()
    change(rows)
    assert.throws(() => assertComplete(rows), /senkron durduruldu/)
  }
})
