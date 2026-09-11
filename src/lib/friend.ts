import { supabase } from './supabase'

export async function sendFriendRequest(fromId: string, friendCode: string) {
  // Find user by friend code
  const { data: toUser, error: findError } = await supabase
    .from('profiles')
    .select('id, username, nickname')
    .eq('friend_code', friendCode)
    .single()

  if (findError || !toUser) {
    throw new Error('존재하지 않는 친구 코드입니다.')
  }

  if (toUser.id === fromId) {
    throw new Error('자기 자신에게는 친구 요청을 보낼 수 없습니다.')
  }

  // Check if already friends
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(user_a.eq.${fromId},user_b.eq.${toUser.id}),and(user_a.eq.${toUser.id},user_b.eq.${fromId})`)
    .single()

  if (friendship) {
    throw new Error('이미 친구 관계입니다.')
  }

  // Check if request already exists
  const { data: existingRequest } = await supabase
    .from('friend_requests')
    .select('id, status')
    .or(`and(from_id.eq.${fromId},to_id.eq.${toUser.id}),and(from_id.eq.${toUser.id},to_id.eq.${fromId})`)
    .maybeSingle()

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      throw new Error('이미 친구 요청을 보냈거나 받은 상태입니다.')
    }
  }

  // Create friend request
  const { error: createError } = await supabase
    .from('friend_requests')
    .insert([
      {
        from_id: fromId,
        to_id: toUser.id,
        status: 'pending'
      }
    ])

  if (createError) {
    throw new Error('친구 요청 전송에 실패했습니다: ' + createError.message)
  }

  return toUser
}

export async function respondToFriendRequest(
  requestId: string,
  status: 'accepted' | 'rejected',
  userId: string
) {
  if (status === 'accepted') {
    // Get request details
    const { data: request, error: getError } = await supabase
      .from('friend_requests')
      .select('from_id, to_id')
      .eq('id', requestId)
      .single()

    if (getError || !request) {
      throw new Error('친구 요청을 찾을 수 없습니다.')
    }

    // Create friendship (normalized order)
    const [userA, userB] = request.from_id < request.to_id
      ? [request.from_id, request.to_id]
      : [request.to_id, request.from_id]

    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert([
        {
          user_a: userA,
          user_b: userB,
        }
      ])

    if (friendshipError) {
      throw new Error('친구 관계 생성에 실패했습니다: ' + friendshipError.message)
    }

    // Set default alias (other user's nickname)
    const otherUserId = request.from_id === userId ? request.to_id : request.from_id
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', otherUserId)
      .single()

    if (otherUser) {
      await supabase
        .from('friend_aliases')
        .insert([
          {
            owner_id: userId,
            friend_id: otherUserId,
            alias: otherUser.nickname,
          }
        ])
        .catch(() => {}) // Ignore alias creation errors
    }
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId)
    .eq('to_id', userId)

  if (updateError) {
    throw new Error('친구 요청 응답에 실패했습니다: ' + updateError.message)
  }
}

export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      user_a,
      user_b,
      user_a_profile:profiles!user_a(id, username, nickname, friend_code),
      user_b_profile:profiles!user_b(id, username, nickname, friend_code)
    `)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)

  if (error) {
    throw new Error('친구 목록 조회에 실패했습니다: ' + error.message)
  }

  return data || []
}

export async function getPendingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      from_id,
      to_id,
      status,
      created_at,
      from_profile:profiles!from_id(id, username, nickname),
      to_profile:profiles!to_id(id, username, nickname)
    `)
    .eq('to_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('친구 요청 조회에 실패했습니다: ' + error.message)
  }

  return data || []
}

export async function updateFriendAlias(userId: string, friendId: string, alias: string) {
  const { error } = await supabase
    .from('friend_aliases')
    .update({ alias })
    .eq('owner_id', userId)
    .eq('friend_id', friendId)

  if (error) {
    throw new Error('별칭 수정에 실패했습니다: ' + error.message)
  }
}

export async function getFriendAlias(userId: string, friendId: string) {
  const { data, error } = await supabase
    .from('friend_aliases')
    .select('alias')
    .eq('owner_id', userId)
    .eq('friend_id', friendId)
    .maybeSingle()

  if (error) {
    console.error('별칭 조회 오류:', error)
    return null
  }

  return data?.alias || null
}
