import type { Role } from './types'

/** Web panelindeki yetki kuralının aynısı (client/src/lib/auth.tsx). */
export type Permission = 'operations' | 'accounting' | 'admin'

const roles: Record<Permission, Role[]> = {
  operations: ['Admin', 'Operations'],
  accounting: ['Admin', 'Accounting'],
  admin: ['Admin'],
}

export function can(role: Role | null, p: Permission) {
  return !!role && roles[p].includes(role)
}
