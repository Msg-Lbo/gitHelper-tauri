// 使用前端 fetch 处理 DeepSeek API，支持流式响应
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
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API 请求失败: ${response.status} ${response.statusText}`);
  }

  if (stream) {
    return response; // 返回 Response 对象用于流式处理
  } else {
    return await response.json();
  }
}

// 流式处理 DeepSeek 响应
export const chatWithDeepSeekStream = async (
  messages: any[],
  token: string,
  model = 'deepseek-chat',
  onChunk: (text: string) => void
) => {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API 请求失败: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法获取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.warn('解析流式数据失败:', e, data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const checkDeepSeekBalance = async (token: string) => {
  const response = await fetch('https://api.deepseek.com/user/balance', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`DeepSeek 余额查询失败: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
