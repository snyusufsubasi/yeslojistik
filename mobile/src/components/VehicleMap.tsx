import type { VehicleLocation } from '../lib/officeTypes'

/** Web önizlemesinde harita gösterilmez; araçlar listede görünür. */
export function VehicleMap(_: { vehicles: VehicleLocation[]; onSelect: (id: number) => void }) {
  return null
}
