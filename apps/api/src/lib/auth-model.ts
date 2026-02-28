export type Role = 'org_admin' | 'analyst' | 'client_approver' | 'viewer'

export const roleOrder: Role[] = ['viewer', 'client_approver', 'analyst', 'org_admin']

export function hasRole(userRoles: Role[], allowed: Role[]): boolean {
  return userRoles.some((role) => allowed.includes(role))
}
