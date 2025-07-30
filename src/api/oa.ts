/**
 * OA系统API接口模块
 *
 * 提供OA系统相关的API接口和类型定义。
 * 使用Tauri HTTP客户端解决生产环境跨域问题，
 * 确保开发和生产环境的一致性。
 */

import { oaHttpClient } from '@/utils/tauri-http-client';

// ==================== 配置常量 ====================

// 注意：现在使用 oaHttpClient 统一处理所有HTTP请求

// ==================== 接口类型定义 ====================

// 登录请求参数接口
export interface LoginParams {
  username: string         // 用户名（手机号）
  encryptPassword: string  // 加密后的密码
  code: string            // 验证码
  uuid: string            // 验证码唯一标识
}

// 验证码响应接口
export interface CaptchaResponse {
  msg: string             // 响应消息
  img: string             // 验证码图片（base64）
  code: number            // 响应状态码
  captchaEnabled: boolean // 是否启用验证码
  uuid: string            // 验证码唯一标识
}

// 登录响应接口
export interface LoginResponse {
  msg: string             // 响应消息
  code: number            // 响应状态码
  token?: string          // 登录成功后的token
}

// API响应基础接口（泛型）
export interface ApiResponse<T = any> {
  code: number            // 响应状态码
  msg: string             // 响应消息
  data?: T                // 响应数据（可选）
}

// 项目列表请求参数接口
export interface ProjectListParams {
  projectName: string     // 项目名称搜索关键词
  pageNum: number         // 页码
  pageSize: number        // 每页显示数量
}

// 项目信息接口
export interface ProjectInfo {
  id: string              // 项目ID
  contractId: string        // 合同ID
  projectCode: string       // 项目编码
  projectName: string       // 项目名称
  type: number             // 项目类型
  startTime: string        // 开始时间
  endTime: string          // 结束时间
  realityEndTime?: string  // 实际结束时间（可选）
  schedule: number         // 进度
  stage: string            // 阶段
  status: string           // 状态
  stageName: string        // 阶段名称
  statusName: string       // 状态名称
  userId?: string          // 用户ID（可选）
}

// 分页信息接口（泛型）
export interface PageInfo<T> {
  total: number              // 总记录数
  list: T[]                  // 数据列表
  pageNum: number            // 当前页码
  pageSize: number           // 每页大小
  size: number               // 当前页记录数
  startRow: number           // 起始行号
  endRow: number             // 结束行号
  pages: number              // 总页数
  prePage: number            // 上一页页码
  nextPage: number           // 下一页页码
  isFirstPage: boolean       // 是否为首页
  isLastPage: boolean        // 是否为末页
  hasPreviousPage: boolean   // 是否有上一页
  hasNextPage: boolean       // 是否有下一页
  navigatePages: number      // 导航页数
  navigatepageNums: number[] // 导航页码数组
  navigateFirstPage: number  // 导航首页
  navigateLastPage: number   // 导航末页
}

// 项目列表响应接口
export interface ProjectListResponse extends ApiResponse<PageInfo<ProjectInfo>> {}

// 报告列表请求参数接口
export interface ReportListParams {
  keywords: string           // 关键词搜索
  overtimeStatus: string     // 加班状态
  createTime: {              // 创建时间范围
    start: string            // 开始时间
    end: string              // 结束时间
  }
  pageNum: number            // 页码
  pageSize: number           // 每页显示数量
  projectId: string          // 项目ID
}

// 报告信息接口
export interface ReportInfo {
  id: string                 // 报告ID
  work: number               // 工作时长
  speed: string              // 进度
  projectName: string        // 项目名称
  stage: string              // 阶段ID
  status: string             // 状态ID
  remarks: string            // 备注内容
  workType: number           // 工作类型
  overtimeType: number       // 加班类型
  submitCode: number         // 提交状态码
  projectStartTime: string   // 项目开始时间
  projectEndTime: string     // 项目结束时间
  createTime: string         // 创建时间
  speedPlan: number          // 进度计划
  overtimePlan: number       // 加班计划
  stageName: string          // 阶段名称
  statusName: string         // 状态名称
}

// 报告列表响应接口
export interface ReportListResponse extends ApiResponse<PageInfo<ReportInfo>> {}

// ==================== HTTP客户端类 ====================

/**
 * OA系统API客户端
 * 统一处理HTTP请求和响应
 */
class OAApiClient {
  constructor() {
    // 不再需要baseURL，直接使用oaHttpClient
  }

  /**
   * 发送GET请求
   * @param url 请求URL
   * @param options 请求选项
   * @returns Promise<T> 响应数据
   */
  async get<T = any>(url: string, options?: RequestInit): Promise<T> {
    return this.request<T>(url, {
      method: 'GET',
      ...options
    })
  }

  /**
   * 发送POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param options 请求选项
   * @returns Promise<T> 响应数据
   */
  async post<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    })
  }

  /**
   * 统一请求方法
   * 使用Tauri HTTP客户端解决跨域问题
   */
  private async request<T>(url: string, options: RequestInit): Promise<T> {
    // 获取token并添加到请求头
    const token = OATokenManager.getToken()
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options.headers as Record<string, string>
    }

    // 如果有token且不是登录或验证码接口，则添加Authorization头
    if (token && !url.includes('/login') && !url.includes('/captchaImage')) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      console.log(`[OA API] 请求: ${options.method} ${url}`, token ? '(带token)' : '(无token)')

      // 使用Tauri HTTP客户端
      const method = (options.method || 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE'
      const body = options.body as string | undefined

      let result: T

      switch (method) {
        case 'GET':
          result = await oaHttpClient.get<T>(url, headers)
          break
        case 'POST':
          result = await oaHttpClient.post<T>(url, body ? JSON.parse(body) : undefined, headers)
          break
        case 'PUT':
          result = await oaHttpClient.put<T>(url, body ? JSON.parse(body) : undefined, headers)
          break
        case 'DELETE':
          result = await oaHttpClient.delete<T>(url, headers)
          break
        default:
          throw new Error(`不支持的HTTP方法: ${method}`)
      }

      console.log(`[OA API] 响应:`, result)

      // 检查响应体中的code字段，某些接口可能返回401在响应体中
      if (result && typeof result === 'object' && 'code' in result && (result as any).code === 401) {
        console.warn('[OA API] 响应中检测到401错误，清除本地token')
        OATokenManager.clearToken()
        throw new Error('登录已过期，请重新登录')
      }

      return result as T

    } catch (error) {
      console.error(`[OA API] 请求失败:`, error)
      throw error
    }
  }
}

// 创建API客户端实例
const apiClient = new OAApiClient()

/**
 * 获取验证码
 */
export const getCaptchaImage = async (): Promise<CaptchaResponse> => {
  return apiClient.get<CaptchaResponse>('/captchaImage')
}

/**
 * 用户登录
 */
export const login = async (params: LoginParams): Promise<LoginResponse> => {
  return apiClient.post<LoginResponse>('/login', params)
}

/**
 * Base64编码工具函数
 */
export const encodeBase64 = (str: string): string => {
  try {
    // 使用现代的方式进行UTF-8编码然后Base64编码
    const utf8Bytes = new TextEncoder().encode(str)
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('')
    return btoa(binaryString)
  } catch (error) {
    console.error('Base64编码失败:', error)
    throw new Error('密码编码失败')
  }
}

/**
 * OA Token管理工具
 */
export class OATokenManager {
  private static readonly TOKEN_KEY = 'oa-token'
  private static readonly TOKEN_EXPIRE_KEY = 'oa-token-expire'

  /**
   * 保存Token
   */
  static saveToken(token: string, expireTime?: number): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token)
      if (expireTime) {
        localStorage.setItem(this.TOKEN_EXPIRE_KEY, expireTime.toString())
      }
      console.log('[OA Token] Token已保存')
    } catch (error) {
      console.error('[OA Token] 保存Token失败:', error)
    }
  }

  /**
   * 获取Token
   */
  static getToken(): string | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY)
      const expireTime = localStorage.getItem(this.TOKEN_EXPIRE_KEY)
      
      // 检查Token是否过期
      if (expireTime && Date.now() > parseInt(expireTime)) {
        console.log('[OA Token] Token已过期，自动清除')
        this.clearToken()
        return null
      }
      
      return token
    } catch (error) {
      console.error('[OA Token] 获取Token失败:', error)
      return null
    }
  }

  /**
   * 清除Token
   */
  static clearToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.TOKEN_EXPIRE_KEY)
      console.log('[OA Token] Token已清除')
    } catch (error) {
      console.error('[OA Token] 清除Token失败:', error)
    }
  }

  /**
   * 检查是否已登录
   */
  static isLoggedIn(): boolean {
    return !!this.getToken()
  }
}

/**
 * 账户信息管理工具
 */
export class OAAccountManager {
  private static readonly SETTINGS_KEY = 'githelper-settings'

  /**
   * 保存账户信息
   */
  static saveAccount(username: string, password: string): void {
    try {
      const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}')
      settings.oaAccount = username
      settings.oaPassword = password
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
      console.log('[OA Account] 账户信息已保存')
    } catch (error) {
      console.error('[OA Account] 保存账户信息失败:', error)
    }
  }

  /**
   * 获取账户信息
   */
  static getAccount(): { username: string; password: string } {
    try {
      const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}')
      return {
        username: settings.oaAccount || '',
        password: settings.oaPassword || ''
      }
    } catch (error) {
      console.error('[OA Account] 获取账户信息失败:', error)
      return { username: '', password: '' }
    }
  }

  /**
   * 清除账户信息
   */
  static clearAccount(): void {
    try {
      const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}')
      delete settings.oaAccount
      delete settings.oaPassword
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
      console.log('[OA Account] 账户信息已清除')
    } catch (error) {
      console.error('[OA Account] 清除账户信息失败:', error)
    }
  }
}

/**
 * 获取我的项目列表
 * @param params 查询参数
 * @returns 项目列表响应
 */
export const getMyProjectList = async (params: ProjectListParams): Promise<ProjectListResponse> => {
  return apiClient.post<ProjectListResponse>('/backend/project/myProjectList', params)
}

/**
 * 获取我的报告列表
 * @param params 查询参数
 * @returns 报告列表响应
 */
export const getMyReportingList = async (params: ReportListParams): Promise<ReportListResponse> => {
  return apiClient.post<ReportListResponse>('/system/report/myReportingList', params)
}

/**
 * 获取今日提交工时
 * @returns 今日工时响应
 */
export const getTodayWorkingHours = async (): Promise<ApiResponse<string>> => {
  return apiClient.get<ApiResponse<string>>('/system/report/reportedWorkingHoursToday')
}
