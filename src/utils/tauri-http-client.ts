/**
 * Tauri HTTP客户端工具
 *
 * 通过Tauri命令调用Rust的reqwest库发送HTTP请求，
 * 完美解决了生产环境的跨域问题和权限配置复杂性。
 *
 * 特点：
 * - 绕过浏览器跨域限制
 * - 统一的开发和生产环境行为
 * - 类型安全的TypeScript接口
 * - 支持所有HTTP方法
 */

import { invoke } from '@tauri-apps/api/core';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Tauri HTTP客户端类
 * 通过Tauri命令发送HTTP请求，绕过浏览器跨域限制
 */
export class TauriHttpClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * 发送HTTP请求
   */
  async request<T = any>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body
    } = options;

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    // 准备请求参数
    const requestHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    };

    const requestBody = body ? JSON.stringify(body) : undefined;

    try {
      console.log(`[Tauri HTTP] ${method} ${fullUrl}`);

      // 调用Tauri命令发送请求
      const response = await invoke('http_request', {
        url: fullUrl,
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: requestBody
      }) as string;

      // 尝试解析JSON响应
      try {
        return JSON.parse(response) as T;
      } catch {
        // 如果不是JSON，返回原始字符串
        return response as unknown as T;
      }

    } catch (error) {
      console.error(`[Tauri HTTP] 请求失败:`, error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'GET', headers });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'POST', body: data, headers });
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'PUT', body: data, headers });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', headers });
  }
}

/**
 * 创建OA API客户端实例
 */
export const oaHttpClient = new TauriHttpClient('https://ai.mufengweilai.com/api/oa');

/**
 * 创建DeepSeek API客户端实例
 */
export const deepSeekHttpClient = new TauriHttpClient('https://api.deepseek.com');

/**
 * 默认HTTP客户端
 */
export const httpClient = new TauriHttpClient();
