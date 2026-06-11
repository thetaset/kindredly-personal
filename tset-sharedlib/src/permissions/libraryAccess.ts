export type PermissionLevel = 'owner' | 'editor' | 'viewer' | null

export type DerivedLibraryAccess = {
  adminOverrideEdit: boolean

  canView: boolean
  canEditContent: boolean
  canEditPermissions: boolean
  canChangeOwner: boolean

  isInLibrary: boolean
  isNotInLibrary: boolean
}

export type DeriveLibraryAccessInput = {
  myPermission: PermissionLevel
  currentUserPermission: PermissionLevel
  currentUserNotInLibrary: boolean

  visibility: string | null | undefined
  sameAccount: boolean

  isAdminUser: boolean
  currentAccountId: string | null | undefined
  itemAccountId: string | null | undefined
  ownerUserType: string | null | undefined
}

export function isEditPermission(permission: PermissionLevel | string | null | undefined): boolean {
  return permission === 'owner' || permission === 'editor'
}

export function canAdminOverrideEdit(opts: {
  isAdminUser: boolean
  currentAccountId: string | null | undefined
  itemAccountId: string | null | undefined
  ownerUserType: string | null | undefined
}): boolean {
  if (!opts.isAdminUser) return false
  if (!opts.currentAccountId || !opts.itemAccountId) return false
  if (opts.currentAccountId !== opts.itemAccountId) return false

  // Admins have elevated privileges only within their account, and only for
  // restricted-user-owned content (not other admins) unless explicitly granted.
  return opts.ownerUserType === 'restricted'
}

export function canViewByVisibility(opts: {
  visibility: string | null | undefined
  sameAccount: boolean
}): boolean {
  // NOTE: This mirrors current client behavior. Server-side enforcement should
  // be the source of truth for who is actually in the viewer's network.
  if (opts.visibility === 'network') return true
  if (opts.visibility === 'shared' && opts.sameAccount) return true
  return false
}

export function deriveLibraryAccess(input: DeriveLibraryAccessInput): DerivedLibraryAccess {
  const adminOverrideEdit = canAdminOverrideEdit({
    isAdminUser: input.isAdminUser,
    currentAccountId: input.currentAccountId,
    itemAccountId: input.itemAccountId,
    ownerUserType: input.ownerUserType,
  })

  const canEditContent = isEditPermission(input.myPermission) || adminOverrideEdit

  return {
    adminOverrideEdit,

    isNotInLibrary: !!input.currentUserNotInLibrary,
    isInLibrary: input.currentUserPermission != null && !input.currentUserNotInLibrary,

    canView:
      input.myPermission != null ||
      canViewByVisibility({ visibility: input.visibility, sameAccount: input.sameAccount }) ||
      (input.isAdminUser && input.sameAccount),

    canEditContent,
    canEditPermissions: canEditContent,

    canChangeOwner: input.myPermission === 'owner' || adminOverrideEdit,
  }
}
