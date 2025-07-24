// 使用 fetch 支持流式传输
export const chatWithDeepSeek = async (
  messages: any[],
  token: string,
  model = 'deepseek-chat',
  stream = false
) => {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream
    })
  })
  return response
}

export const checkDeepSeekBalance = async (token: string) => {
  const response = await fetch('https://api.deepseek.com/user/balance', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}
