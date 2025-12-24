import { SessionUser } from './auth'

export type Role = 'ADMIN' | 'CAMPUS_PASTOR' | 'LEADER'

export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  CAMPUS_PASTOR: 2,
  LEADER: 1,
}

export function hasRole(user: SessionUser, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]
}

export function canApproveExpenses(user: SessionUser): boolean {
  return hasRole(user, 'ADMIN')
}

export function canAddPastorRemarks(user: SessionUser): boolean {
  return user.role === 'CAMPUS_PASTOR'
}

export function canViewAllExpenses(user: SessionUser): boolean {
  return hasRole(user, 'CAMPUS_PASTOR')
}

export function canManageUsers(user: SessionUser): boolean {
  return hasRole(user, 'ADMIN')
}

export function canManageTeams(user: SessionUser): boolean {
  return hasRole(user, 'CAMPUS_PASTOR')
}

export function canMarkAsPaid(user: SessionUser): boolean {
  return hasRole(user, 'ADMIN')
}

export function canExportData(user: SessionUser): boolean {
  return hasRole(user, 'CAMPUS_PASTOR')
}

export function getApprovalStages(user: SessionUser): number[] {
  if (user.role === 'ADMIN') {
    return [1, 2] // Can approve at both stages
  }
  return [] // Only admins can approve
}

export function canApproveAtStage(user: SessionUser, stage: number): boolean {
  const allowedStages = getApprovalStages(user)
  return allowedStages.includes(stage)
}

export function canUpdateExpenseItems(user: SessionUser): boolean {
  return hasRole(user, 'ADMIN')
}
