/**
 * Tauri HTTP客户端工具
 *
 * 通过Tauri命令调用Rust的reqwest库发送HTTP请求，
 * 完美解决了生产环境的跨域问题和权限配置复杂性。
 *
 * 核心特点：
 * - 绕过浏览器跨域限制
 * - 统一的开发和生产环境行为
 * - 类型安全的TypeScript接口
 * - 支持所有HTTP方法（GET、POST、PUT、DELETE）
 * - 自动JSON序列化和反序列化
 * - 完整的错误处理机制
 */

import { invoke } from '@tauri-apps/api/core';

// ==================== 类型定义 ====================

/**
 * HTTP请求选项接口
 */
export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';  // HTTP方法
  headers?: Record<string, string>;             // 请求头
  body?: any;                                   // 请求体
}

// ==================== HTTP客户端类 ====================

/**
 * Tauri HTTP客户端类
 * 通过Tauri命令发送HTTP请求，绕过浏览器跨域限制
 */
export class TauriHttpClient {
  private readonly baseURL: string;

  /**
   * 构造函数
   * @param baseURL 基础URL，可选
   */
  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * 发送HTTP请求的核心方法
   * @param url 请求URL
   * @param options 请求选项
   * @returns Promise<T> 响应数据
   */
  async request<T = any>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body
    } = options;

    // 构建完整URL
    const fullUrl = this.buildFullUrl(url);

    // 准备请求头
    const requestHeaders = this.prepareHeaders(headers);

    // 准备请求体
    const requestBody = this.prepareBody(body);

    try {
      console.log(`[Tauri HTTP] ${method} ${fullUrl}`);

      // 调用Tauri命令发送请求
      const response = await invoke('http_request', {
        url: fullUrl,
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: requestBody
      }) as string;

      // 解析响应
      return this.parseResponse<T>(response);

    } catch (error) {
      console.error(`[Tauri HTTP] 请求失败:`, error);
      throw error;
    }
  }

  /**
   * 构建完整URL
   * @param url 相对或绝对URL
   * @returns string 完整URL
   */
  private buildFullUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.baseURL}${url}`;
  }

  /**
   * 准备请求头
   * @param headers 自定义请求头
   * @returns Record<string, string> 完整请求头
   */
  private prepareHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    };
  }

  /**
   * 准备请求体
   * @param body 请求体数据
   * @returns string | undefined 序列化后的请求体
   */
  private prepareBody(body: any): string | undefined {
    return body ? JSON.stringify(body) : undefined;
  }

  /**
   * 解析响应数据
   * @param response 原始响应字符串
   * @returns T 解析后的数据
   */
  private parseResponse<T>(response: string): T {
    try {
      return JSON.parse(response) as T;
    } catch {
      // 如果不是JSON，返回原始字符串
      return response as unknown as T;
    }
  }

  // ==================== HTTP方法快捷方式 ====================

  /**
   * 发送GET请求
   * @param url 请求URL
   * @param headers 请求头（可选）
   * @returns Promise<T> 响应数据
   */
  async get<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'GET', headers });
  }

  /**
   * 发送POST请求
   * @param url 请求URL
   * @param data 请求数据（可选）
   * @param headers 请求头（可选）
   * @returns Promise<T> 响应数据
   */
  async post<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'POST', body: data, headers });
  }

  /**
   * 发送PUT请求
   * @param url 请求URL
   * @param data 请求数据（可选）
   * @param headers 请求头（可选）
   * @returns Promise<T> 响应数据
   */
  async put<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'PUT', body: data, headers });
  }

  /**
   * 发送DELETE请求
   * @param url 请求URL
   * @param headers 请求头（可选）
   * @returns Promise<T> 响应数据
   */
  async delete<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', headers });
  }
}

// ==================== 预配置客户端实例 ====================

/**
 * OA系统API客户端实例
 * 预配置了OA系统的基础URL
 */
export const oaHttpClient = new TauriHttpClient('https://ai.mufengweilai.com/api/oa');

/**
 * DeepSeek API客户端实例
 * 预配置了DeepSeek API的基础URL
 */
export const deepSeekHttpClient = new TauriHttpClient('https://api.deepseek.com');

/**
 * 通用HTTP客户端实例
 * 可用于任意URL的HTTP请求
 */
export const httpClient = new TauriHttpClient();
