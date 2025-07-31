/**
 * 应用配置管理模块
 * 负责读取和管理应用的配置信息，包括WebDAV服务器配置等
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// WebDAV配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebDAVConfig {
    pub url: String,
    pub username: String,
    pub password: String,
    pub remote_path: String,
    pub base_url: String,
}

/// 应用配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub webdav: WebDAVConfig,
}

impl Default for WebDAVConfig {
    fn default() -> Self {
        Self {
            url: "https://your-server.com/webdav".to_string(),
            username: "your-username".to_string(),
            password: "your-password".to_string(),
            remote_path: "/releases".to_string(),
            base_url: "https://your-server.com/releases".to_string(),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            webdav: WebDAVConfig::default(),
        }
    }
}

/// 获取配置文件路径
fn get_config_path() -> Result<PathBuf, String> {
    let app_data_dir = dirs::config_dir()
        .ok_or("无法获取配置目录")?;
    
    let config_dir = app_data_dir.join("WorkHelper");
    
    // 确保配置目录存在
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    
    Ok(config_dir.join("config.json"))
}

/// 加载应用配置
pub fn load_config() -> AppConfig {
    match get_config_path() {
        Ok(config_path) => {
            if config_path.exists() {
                match fs::read_to_string(&config_path) {
                    Ok(content) => {
                        match serde_json::from_str::<AppConfig>(&content) {
                            Ok(config) => {
                                log::info!("配置文件加载成功: {}", config_path.display());
                                return config;
                            }
                            Err(e) => {
                                log::warn!("解析配置文件失败: {} - 使用默认配置", e);
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("读取配置文件失败: {} - 使用默认配置", e);
                    }
                }
            } else {
                log::info!("配置文件不存在，将创建默认配置: {}", config_path.display());
                
                // 创建默认配置文件
                let default_config = AppConfig::default();
                if let Err(e) = save_config(&default_config) {
                    log::warn!("保存默认配置失败: {}", e);
                }
                
                return default_config;
            }
        }
        Err(e) => {
            log::error!("获取配置路径失败: {} - 使用默认配置", e);
        }
    }
    
    AppConfig::default()
}

/// 保存应用配置
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path()?;
    
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    fs::write(&config_path, content)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;
    
    log::info!("配置文件保存成功: {}", config_path.display());
    Ok(())
}

/// 从环境变量加载WebDAV配置（用于CI/CD或生产环境）
pub fn load_webdav_from_env() -> Option<WebDAVConfig> {
    use std::env;

    // 首先尝试加载 .env 文件
    if let Err(e) = dotenv::dotenv() {
        log::debug!("无法加载 .env 文件: {}", e);
    } else {
        log::info!("成功加载 .env 文件");
    }

    let url = env::var("WEBDAV_URL").ok()?;
    let username = env::var("WEBDAV_USERNAME").ok()?;
    let password = env::var("WEBDAV_PASSWORD").ok()?;
    let remote_path = env::var("WEBDAV_REMOTE_PATH").unwrap_or("/releases".to_string());
    let base_url = env::var("WEBDAV_BASE_URL").ok()?;

    log::info!("从环境变量加载WebDAV配置: url={}, username={}, remote_path={}, base_url={}",
               url, username, remote_path, base_url);

    Some(WebDAVConfig {
        url,
        username,
        password,
        remote_path,
        base_url,
    })
}

/// 获取有效的WebDAV配置（优先使用环境变量）
pub fn get_webdav_config() -> WebDAVConfig {
    // 优先从环境变量加载
    if let Some(env_config) = load_webdav_from_env() {
        log::info!("使用环境变量中的WebDAV配置");
        return env_config;
    }
    
    // 否则从配置文件加载
    let app_config = load_config();
    log::info!("使用配置文件中的WebDAV配置");
    app_config.webdav
}
