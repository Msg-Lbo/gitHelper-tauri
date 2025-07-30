import { deepSeekHttpClient } from '@/utils/tauri-http-client';

// 使用 Tauri HTTP 客户端，解决生产环境跨域问题
export const chatWithDeepSeek = async (
  messages: any[],
  token: string,
  model = 'deepseek-chat',
  stream = false
) => {
  const response = await deepSeekHttpClient.post('/v1/chat/completions', {
    model,
    messages,
    stream
  }, {
    'Authorization': `Bearer ${token}`
  })
  return response
}

export const checkDeepSeekBalance = async (token: string) => {
  const response = await deepSeekHttpClient.get('/user/balance', {
    'Authorization': `Bearer ${token}`
  })
  return response
}
