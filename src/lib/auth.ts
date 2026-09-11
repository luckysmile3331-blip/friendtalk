import { supabase } from './supabase'
import { generateFriendCode, validateUsername, validatePassword, validateNickname } from './utils'

export interface SignUpData {
  username: string
  password: string
  nickname: string
}

export interface SignInData {
  username: string
  password: string
}

export async function signUp(data: SignUpData) {
  // Validate inputs
  if (!validateUsername(data.username)) {
    throw new Error('아이디는 2-20자, 한글/영문/숫자/_만 사용 가능합니다.')
  }

  if (!validatePassword(data.password)) {
    throw new Error('비밀번호는 최소 8자 이상이어야 합니다.')
  }

  if (!validateNickname(data.nickname)) {
    throw new Error('닉네임을 입력해주세요.')
  }

  // Check if username already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', data.username)
    .single()

  if (existingUser) {
    throw new Error('이미 사용 중인 아이디입니다.')
  }

  // Generate unique friend code
  let friendCode: string
  let isUnique = false
  while (!isUnique) {
    friendCode = generateFriendCode()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('friend_code', friendCode)
      .single()

    if (!existing) {
      isUnique = true
    }
  }

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `${data.username}@friendtalk.local`,
    password: data.password,
  })

  if (authError) {
    throw new Error('회원가입에 실패했습니다: ' + authError.message)
  }

  if (!authData.user) {
    throw new Error('사용자 생성에 실패했습니다.')
  }

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: authData.user.id,
        username: data.username,
        nickname: data.nickname,
        friend_code: friendCode,
      }
    ])

  if (profileError) {
    // Delete the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('프로필 생성에 실패했습니다: ' + profileError.message)
  }

  return authData.user
}

export async function signIn(data: SignInData) {
  // Get user by username to find their email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', data.username)
    .single()

  if (profileError || !profile) {
    throw new Error('존재하지 않는 아이디입니다.')
  }

  // Sign in with email format
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: `${data.username}@friendtalk.local`,
    password: data.password,
  })

  if (authError) {
    throw new Error('로그인에 실패했습니다. 아이디/비밀번호를 확인해주세요.')
  }

  return authData.session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error('로그아웃에 실패했습니다: ' + error.message)
  }
}
