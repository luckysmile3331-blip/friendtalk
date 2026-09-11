import { supabase } from './supabase'

export async function createGroupChat(userId: string, name: string, memberIds: string[]) {
  // Create group
  const { data: group, error: groupError } = await supabase
    .from('group_chats')
    .insert([
      {
        name,
        owner_id: userId,
      }
    ])
    .select()
    .single()

  if (groupError || !group) {
    throw new Error('단체방 생성에 실패했습니다: ' + groupError?.message)
  }

  // Add owner as member
  await supabase
    .from('group_members')
    .insert([
      {
        group_id: group.id,
        user_id: userId,
      }
    ])

  // Send invites to other members
  if (memberIds.length > 0) {
    const invites = memberIds.map(memberId => ({
      group_id: group.id,
      inviter_id: userId,
      invitee_id: memberId,
      status: 'pending'
    }))

    await supabase
      .from('group_invites')
      .insert(invites)
  }

  return group
}

export async function getUserGroups(userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      group_chats(
        id,
        name,
        owner_id,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('단체방 목록 조회에 실패했습니다: ' + error.message)
  }

  return data?.map(item => item.group_chats).filter(Boolean) || []
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      profiles(id, username, nickname)
    `)
    .eq('group_id', groupId)

  if (error) {
    throw new Error('멤버 목록 조회에 실패했습니다: ' + error.message)
  }

  return data?.map(item => ({ user_id: item.user_id, profile: item.profiles })) || []
}

export async function getPendingInvites(userId: string) {
  const { data, error } = await supabase
    .from('group_invites')
    .select(`
      id,
      group_id,
      inviter_id,
      group_chats(id, name, owner_id),
      inviter:profiles!inviter_id(id, username, nickname),
      created_at
    `)
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('초대 목록 조회에 실패했습니다: ' + error.message)
  }

  return data || []
}

export async function respondToGroupInvite(
  inviteId: string,
  status: 'accepted' | 'rejected',
  userId: string
) {
  // Update invite status
  const { error: updateError } = await supabase
    .from('group_invites')
    .update({ status })
    .eq('id', inviteId)
    .eq('invitee_id', userId)

  if (updateError) {
    throw new Error('초대 응답에 실패했습니다: ' + updateError.message)
  }

  // If accepted, add user to group members
  if (status === 'accepted') {
    const { data: invite } = await supabase
      .from('group_invites')
      .select('group_id')
      .eq('id', inviteId)
      .single()

    if (invite) {
      await supabase
        .from('group_members')
        .insert([
          {
            group_id: invite.group_id,
            user_id: userId,
          }
        ])
    }
  }
}

export async function leaveGroup(userId: string, groupId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) {
    throw new Error('단체방 나가기에 실패했습니다: ' + error.message)
  }
}
