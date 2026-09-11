import { supabase } from './supabase'

export async function sendDirectMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert([
      {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      }
    ])
    .select()
    .single()

  if (error) {
    throw new Error('메시지 전송에 실패했습니다: ' + error.message)
  }

  return data
}

export async function getDirectMessages(userId: string, otherUserId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      id,
      sender_id,
      receiver_id,
      content,
      created_at
    `)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error('메시지 조회에 실패했습니다: ' + error.message)
  }

  return data || []
}

export async function sendGroupMessage(senderId: string, groupId: string, content: string) {
  const { data, error } = await supabase
    .from('group_messages')
    .insert([
      {
        sender_id: senderId,
        group_id: groupId,
        content,
      }
    ])
    .select()
    .single()

  if (error) {
    throw new Error('메시지 전송에 실패했습니다: ' + error.message)
  }

  return data
}

export async function getGroupMessages(groupId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('group_messages')
    .select(`
      id,
      sender_id,
      content,
      created_at,
      sender:profiles(id, username, nickname)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error('메시지 조회에 실패했습니다: ' + error.message)
  }

  return data || []
}
