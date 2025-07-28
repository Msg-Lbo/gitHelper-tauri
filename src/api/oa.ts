/**
 * OA系统API接口
 */

// OA系统基础URL - 使用代理路径
const OA_BASE_URL = '/api/oa'

// 登录请求参数接口
export interface LoginParams {
  username: string
  encryptPassword: string
  code: string
  uuid: string
}

// 验证码响应接口
export interface CaptchaResponse {
  msg: string
  img: string
  code: number
  captchaEnabled: boolean
  uuid: string
}

// 登录响应接口
export interface LoginResponse {
  msg: string
  code: number
  token?: string
}

// API响应基础接口
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data?: T
}

// 项目列表请求参数接口
export interface ProjectListParams {
  projectName: string
  pageNum: number
  pageSize: number
}

// 项目信息接口
export interface ProjectInfo {
  id: string
  contractId: string
  projectCode: string
  projectName: string
  type: number
  startTime: string
  endTime: string
  realityEndTime?: string
  schedule: number
  stage: string
  status: string
  stageName: string
  statusName: string
  userId?: string
}

// 分页信息接口
export interface PageInfo<T> {
  total: number
  list: T[]
  pageNum: number
  pageSize: number
  size: number
  startRow: number
  endRow: number
  pages: number
  prePage: number
  nextPage: number
  isFirstPage: boolean
  isLastPage: boolean
  hasPreviousPage: boolean
  hasNextPage: boolean
  navigatePages: number
  navigatepageNums: number[]
  navigateFirstPage: number
  navigateLastPage: number
}

// 项目列表响应接口
export interface ProjectListResponse extends ApiResponse<PageInfo<ProjectInfo>> {}

/**
 * HTTP请求拦截器
 * 统一处理请求和响应
 */
class OAApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /**
   * 发送GET请求
   */
  async get<T = any>(url: string, options?: RequestInit): Promise<T> {
    return this.request<T>(url, {
      method: 'GET',
      ...options
    })
  }

  /**
   * 发送POST请求
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
   */
  private async request<T>(url: string, options: RequestInit): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`

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
      console.log(`[OA API] 请求: ${options.method} ${fullUrl}`, token ? '(带token)' : '(无token)')

      const response = await fetch(fullUrl, {
        ...options,
        headers
      })

      // 检查HTTP状态码
      if (!response.ok) {
        // 处理401未授权错误
        if (response.status === 401) {
          console.warn('[OA API] Token已过期或无效，清除本地token')
          OATokenManager.clearToken()
          throw new Error('登录已过期，请重新登录')
        }
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      console.log(`[OA API] 响应:`, result)

      // 检查响应体中的code字段，某些接口可能返回401在响应体中
      if (result.code === 401) {
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
const apiClient = new OAApiClient(OA_BASE_URL)

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
