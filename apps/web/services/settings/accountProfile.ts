import { updateProfile } from './profile'

/** Public profile reads omit email; only restore it for the signed-in owner. */
export function ownAccountProfile(profile: any, signedInUser: any) {
  return {
    ...profile,
    email: profile.email ?? (profile.id === signedInUser?.id ? signedInUser.email : undefined) ?? '',
  }
}

/** A resolved HTTP request is not necessarily a successful save. */
export async function saveAccountProfile(data: any, userId: number, token: string) {
  const response = await updateProfile(data, userId, token)
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Profile changes were not saved. Please try again.')
  }
  return response
}
