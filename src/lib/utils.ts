export function generateFriendCode(): string {
  const prefix = 'FT'
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `${prefix}-${randomNum}`
}

export function validateUsername(username: string): boolean {
  // Allow Korean, English, numbers, and underscore
  const regex = /^[\p{Script=Hangul}a-zA-Z0-9_]{2,20}$/u
  return regex.test(username)
}

export function validatePassword(password: string): boolean {
  return password.length >= 8
}

export function validateNickname(nickname: string): boolean {
  return nickname.length > 0 && nickname.length <= 30
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`

  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
