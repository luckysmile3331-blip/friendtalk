import { supabase } from './supabase'

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, nickname, friend_code, created_at')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error('프로필 조회에 실패했습니다: ' + error.message)
  }

  return data
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, nickname, friend_code')
    .eq('username', username)
    .single()

  if (error) {
    throw new Error('프로필을 찾을 수 없습니다: ' + error.message)
  }

  return data
}

export async function updateProfile(userId: string, updates: { nickname?: string }) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    throw new Error('프로필 업데이트에 실패했습니다: ' + error.message)
  }
}
