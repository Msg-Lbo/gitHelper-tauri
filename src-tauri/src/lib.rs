use std::process::Command;
use std::path::PathBuf;
use std::fs;
use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;

// 配置模块
mod config;
use config::get_webdav_config;

// ==================== 更新相关数据结构 ====================

/// 版本信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionInfo {
    pub version: String,
    pub release_date: String,
    pub changelog: String,
    pub download_url: String,
    pub file_size: u64,
    pub file_size_formatted: String,
    pub platform: String,
    pub file_type: String,
}

/// 更新检查结果
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub version_info: Option<VersionInfo>,
    pub error: Option<String>,
}

/// 下载进度信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
    pub speed: String,
    pub remaining_time: String,
}

/// 下载状态枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DownloadStatus {
    #[serde(rename = "idle")]
    Idle,
    #[serde(rename = "downloading")]
    Downloading,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "cancelled")]
    Cancelled,
}

/// 下载结果
#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResult {
    pub status: DownloadStatus,
    pub file_path: Option<String>,
    pub error: Option<String>,
}

// ==================== Tauri 命令实现 ====================

// Tauri 命令：选择目录
#[tauri::command]
async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    use tokio::sync::oneshot;
    use std::path::Path;

    let (tx, rx) = oneshot::channel();
    let tx = Arc::new(Mutex::new(Some(tx)));

    app.dialog().file().pick_folder(move |folder_path| {
        if let Ok(mut sender) = tx.lock() {
            if let Some(tx) = sender.take() {
                let _ = tx.send(folder_path);
            }
        }
    });

    match rx.await {
        Ok(Some(path)) => {
            let path_str = path.to_string();

            // 检查选择的目录是否包含 .git 文件夹
            let git_path = Path::new(&path_str).join(".git");
            if !git_path.exists() {
                return Err("该文件夹未进行git初始化或不是项目文件夹".to_string());
            }

            Ok(Some(path_str))
        },
        Ok(None) => Ok(None),
        Err(_) => Err("选择目录失败".to_string()),
    }
}

// Tauri 命令：执行 Git 命令
#[tauri::command]
async fn run_git_log(command: String, project_path: String) -> Result<String, String> {
    // 验证项目路径是否存在
    if !std::path::Path::new(&project_path).exists() {
        return Err(format!("项目路径不存在: {}", project_path));
    }

    // 处理Windows UNC路径问题
    let working_path = if project_path.starts_with(r"\\?\") {
        project_path.strip_prefix(r"\\?\").unwrap_or(&project_path).to_string()
    } else {
        project_path.clone()
    };

    // 验证处理后的路径
    if !std::path::Path::new(&working_path).exists() {
        return Err(format!("处理后的路径不存在: {} (原路径: {})", working_path, project_path));
    }

    // 使用PowerShell执行Git命令，正确处理引号和中文路径
    let output = Command::new("powershell")
        .arg("-Command")
        .arg(&command)
        .current_dir(&working_path)
        .env("LANG", "zh_CN.UTF-8")
        .env("LC_ALL", "zh_CN.UTF-8")
        .output();

    match output {
        Ok(output) => {
            if !output.status.success() {
                let error_bytes = &output.stderr;
                let error_msg = if error_bytes.is_empty() {
                    "命令执行失败，但没有错误信息".to_string()
                } else {
                    // 尝试解码错误信息，支持UTF-8和GBK编码
                    match String::from_utf8(error_bytes.to_vec()) {
                        Ok(s) => s,
                        Err(_) => {
                            let (decoded_str, _, _) = encoding_rs::GBK.decode(error_bytes);
                            decoded_str.into_owned()
                        }
                    }
                };
                return Err(format!("Git命令执行失败: {}", error_msg.trim()));
            }

            // 处理成功的输出，支持UTF-8和GBK编码
            let bytes = &output.stdout;
            match String::from_utf8(bytes.to_vec()) {
                Ok(s) => Ok(s),
                Err(_) => {
                    let (decoded_str, _, _) = encoding_rs::GBK.decode(bytes);
                    Ok(decoded_str.into_owned())
                }
            }
        }
        Err(e) => Err(format!("执行命令时发生系统错误: {} (项目路径: {})", e, working_path)),
    }
}


// Tauri 命令：获取应用版本
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Tauri 命令：检查更新
#[tauri::command]
async fn check_for_updates() -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    log::info!("开始检查更新，当前版本: {}", current_version);

    // 从WebDAV服务器获取最新版本信息
    match fetch_latest_version_info().await {
        Ok(version_info) => {
            // 比较版本号
            let has_update = is_newer_version(&current_version, &version_info.version);

            if has_update {
                log::info!("发现新版本: {} -> {}", current_version, version_info.version);
                Ok(UpdateCheckResult {
                    has_update: true,
                    current_version,
                    latest_version: Some(version_info.version.clone()),
                    version_info: Some(version_info),
                    error: None,
                })
            } else {
                log::info!("当前已是最新版本: {}", current_version);
                Ok(UpdateCheckResult {
                    has_update: false,
                    current_version,
                    latest_version: Some(version_info.version),
                    version_info: None,
                    error: None,
                })
            }
        }
        Err(error) => {
            log::error!("检查更新失败: {}", error);
            Ok(UpdateCheckResult {
                has_update: false,
                current_version,
                latest_version: None,
                version_info: None,
                error: Some(error),
            })
        }
    }
}

// Tauri 命令：最小化窗口
#[tauri::command]
async fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

// Tauri 命令：关闭窗口
#[tauri::command]
async fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

// 从WebDAV服务器获取最新版本信息
async fn fetch_latest_version_info() -> Result<VersionInfo, String> {
    // 获取WebDAV配置
    let webdav_config = get_webdav_config();
    let latest_json_url = format!("{}{}/latest.json", webdav_config.url, webdav_config.remote_path);

    // 创建HTTP客户端
    let client = reqwest::Client::new();

    // 构建认证头
    use base64::{Engine as _, engine::general_purpose};
    let auth = general_purpose::STANDARD.encode(format!("{}:{}", webdav_config.username, webdav_config.password));

    // 发送请求获取版本信息
    let response = client
        .get(&latest_json_url)
        .header("Authorization", format!("Basic {}", auth))
        .send()
        .await
        .map_err(|e| format!("请求版本信息失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("获取版本信息失败，状态码: {}", response.status()));
    }

    // 解析JSON响应
    let version_data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析版本信息失败: {}", e))?;

    // 提取版本信息
    let version = version_data["version"]
        .as_str()
        .ok_or("版本号字段缺失")?
        .to_string();

    let release_date = version_data["releaseDate"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let changelog = version_data["changelog"]
        .as_str()
        .unwrap_or("本次更新无代码变更")
        .to_string();

    // 构建Windows平台的下载URL
    let download_url = format!(
        "{}/v{}/windows/WorkHelper_{}_x64-setup.exe",
        webdav_config.base_url, version, version
    );

    // 尝试从JSON中获取文件大小，如果没有则从服务器获取
    let (file_size, file_size_formatted) = if let (Some(size), Some(formatted)) = (
        version_data["fileSize"].as_u64(),
        version_data["fileSizeFormatted"].as_str()
    ) {
        (size, formatted.to_string())
    } else {
        // 如果JSON中没有文件大小信息，则从服务器获取
        get_file_size(&client, &download_url, &auth).await
    };

    Ok(VersionInfo {
        version,
        release_date,
        changelog,
        download_url,
        file_size,
        file_size_formatted,
        platform: "windows".to_string(),
        file_type: "exe".to_string(),
    })
}

// 比较版本号，判断是否有新版本
fn is_newer_version(current: &str, latest: &str) -> bool {
    // 简单的版本号比较，实际项目中建议使用semver库
    let current_parts: Vec<u32> = current
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    let latest_parts: Vec<u32> = latest
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    // 补齐版本号位数
    let max_len = current_parts.len().max(latest_parts.len());
    let mut current_padded = current_parts;
    let mut latest_padded = latest_parts;

    current_padded.resize(max_len, 0);
    latest_padded.resize(max_len, 0);

    // 逐位比较
    for (c, l) in current_padded.iter().zip(latest_padded.iter()) {
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }

    false
}

// 获取文件大小
async fn get_file_size(client: &reqwest::Client, url: &str, auth: &str) -> (u64, String) {
    // 首先尝试HEAD请求
    if let Ok(response) = client
        .head(url)
        .header("Authorization", format!("Basic {}", auth))
        .send()
        .await
    {
        if response.status().is_success() {
            if let Some(content_length) = response.headers().get("content-length") {
                if let Ok(content_length_str) = content_length.to_str() {
                    if let Ok(size) = content_length_str.parse::<u64>() {
                        return (size, format_file_size(size));
                    }
                }
            }
        }
    }

    // 如果HEAD请求失败，尝试Range请求获取文件大小
    if let Ok(response) = client
        .get(url)
        .header("Authorization", format!("Basic {}", auth))
        .header("Range", "bytes=0-0")
        .send()
        .await
    {
        if response.status().as_u16() == 206 { // Partial Content
            if let Some(content_range) = response.headers().get("content-range") {
                if let Ok(range_str) = content_range.to_str() {
                    // 解析 "bytes 0-0/12345" 格式
                    if let Some(total_size_str) = range_str.split('/').nth(1) {
                        if let Ok(size) = total_size_str.parse::<u64>() {
                            return (size, format_file_size(size));
                        }
                    }
                }
            }
        }
    }

    // 尝试WebDAV PROPFIND请求
    if let Some((size, formatted)) = get_file_size_webdav(client, url, auth).await {
        return (size, formatted);
    }

    // 如果都失败了，尝试下载前1KB来验证文件存在
    if let Ok(response) = client
        .get(url)
        .header("Authorization", format!("Basic {}", auth))
        .header("Range", "bytes=0-1023")
        .send()
        .await
    {
        if response.status().is_success() {
            // 如果部分下载成功，说明文件存在，返回估算大小
            return (10_000_000, "约 10 MB".to_string());
        }
    }

    // 如果都失败了，返回默认值
    (0, "未知".to_string())
}

// 使用WebDAV PROPFIND获取文件大小
async fn get_file_size_webdav(client: &reqwest::Client, url: &str, auth: &str) -> Option<(u64, String)> {
    let propfind_body = r#"<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
    <D:prop>
        <D:getcontentlength/>
    </D:prop>
</D:propfind>"#;

    match client
        .request(reqwest::Method::from_bytes(b"PROPFIND").ok()?, url)
        .header("Authorization", format!("Basic {}", auth))
        .header("Content-Type", "application/xml")
        .header("Depth", "0")
        .body(propfind_body)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(body) = response.text().await {
                    // 简单的XML解析，查找getcontentlength
                    if let Some(start) = body.find("<D:getcontentlength>") {
                        if let Some(end) = body[start..].find("</D:getcontentlength>") {
                            let size_str = &body[start + 20..start + end];
                            if let Ok(size) = size_str.parse::<u64>() {
                                return Some((size, format_file_size(size)));
                            }
                        }
                    }

                    // 尝试其他可能的标签格式
                    if let Some(start) = body.find("<getcontentlength>") {
                        if let Some(end) = body[start..].find("</getcontentlength>") {
                            let size_str = &body[start + 18..start + end];
                            if let Ok(size) = size_str.parse::<u64>() {
                                return Some((size, format_file_size(size)));
                            }
                        }
                    }
                }
            }
        }
        Err(_) => {}
    }

    None
}

// 格式化文件大小
fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

// Tauri 命令：健康检查
#[tauri::command]
fn health_check() -> Result<String, String> {
    log::info!("应用程序健康检查");
    Ok("应用程序运行正常".to_string())
}

// Tauri 命令：下载更新包
#[tauri::command]
async fn download_update(
    app: tauri::AppHandle,
    download_url: String,
    file_name: String,
    expected_size: u64,
) -> Result<DownloadResult, String> {
    log::info!("开始下载更新包: {}", file_name);

    // 获取下载目录
    let download_dir = get_updates_directory()?;
    let file_path = download_dir.join(&file_name);

    // 创建HTTP客户端
    let client = reqwest::Client::new();

    // 发送下载请求
    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("下载请求失败: {}", e))?;

    if !response.status().is_success() {
        return Ok(DownloadResult {
            status: DownloadStatus::Failed,
            file_path: None,
            error: Some(format!("下载失败，状态码: {}", response.status())),
        });
    }

    // 获取文件总大小
    let total_size = response.content_length().unwrap_or(expected_size);

    // 创建文件
    let mut file = tokio::fs::File::create(&file_path)
        .await
        .map_err(|e| format!("创建文件失败: {}", e))?;

    // 下载文件并显示进度
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();
    let start_time = std::time::Instant::now();

    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载数据失败: {}", e))?;

        file.write_all(&chunk)
            .await
            .map_err(|e| format!("写入文件失败: {}", e))?;

        downloaded += chunk.len() as u64;

        // 计算下载进度
        let percentage = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 100.0
        } else {
            0.0
        };

        // 计算下载速度
        let elapsed = start_time.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 {
            downloaded as f64 / elapsed
        } else {
            0.0
        };

        // 计算剩余时间
        let remaining_bytes = total_size.saturating_sub(downloaded);
        let remaining_time = if speed > 0.0 {
            remaining_bytes as f64 / speed
        } else {
            0.0
        };

        // 发送进度事件
        let progress = DownloadProgress {
            downloaded,
            total: total_size,
            percentage,
            speed: format_speed(speed),
            remaining_time: format_time(remaining_time),
        };

        if let Err(e) = app.emit("download-progress", &progress) {
            log::warn!("发送下载进度事件失败: {}", e);
        }

        // 每下载1MB发送一次进度更新
        if downloaded % (1024 * 1024) == 0 || downloaded >= total_size {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
    }

    file.flush().await.map_err(|e| format!("刷新文件失败: {}", e))?;

    log::info!("更新包下载完成: {}", file_path.display());

    Ok(DownloadResult {
        status: DownloadStatus::Completed,
        file_path: Some(file_path.to_string_lossy().to_string()),
        error: None,
    })
}

// Tauri 命令：取消下载
#[tauri::command]
async fn cancel_download() -> Result<(), String> {
    // 这里可以实现下载取消逻辑
    // 由于当前实现是同步下载，实际项目中需要使用可取消的异步任务
    log::info!("取消下载请求");
    Ok(())
}

// Tauri 命令：安装更新并重启
#[tauri::command]
async fn install_update_and_restart(file_path: String) -> Result<(), String> {
    log::info!("开始安装更新: {}", file_path);

    // 验证文件存在
    if !std::path::Path::new(&file_path).exists() {
        return Err("更新文件不存在".to_string());
    }

    // 启动安装程序
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        Command::new(&file_path)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("启动安装程序失败: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(&file_path)
            .spawn()
            .map_err(|e| format!("启动安装程序失败: {}", e))?;
    }

    // 等待一小段时间确保安装程序启动
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

    // 退出当前应用
    std::process::exit(0);
}

// Tauri 命令：获取已下载的更新路径
#[tauri::command]
async fn get_downloaded_update_path(version: String) -> Result<Option<String>, String> {
    let updates_dir = get_updates_directory()?;
    let file_name = format!("WorkHelper_{}_x64-setup.exe", version);
    let file_path = updates_dir.join(&file_name);

    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

// Tauri 命令：清理旧的更新文件
#[tauri::command]
async fn cleanup_old_updates() -> Result<(), String> {
    let updates_dir = get_updates_directory()?;

    if !updates_dir.exists() {
        return Ok(());
    }

    // 读取目录中的所有文件
    let entries = fs::read_dir(&updates_dir)
        .map_err(|e| format!("读取更新目录失败: {}", e))?;

    let current_version = env!("CARGO_PKG_VERSION");

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        if path.is_file() {
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                // 如果不是当前版本的更新文件，则删除
                if !file_name.contains(current_version) && file_name.ends_with(".exe") {
                    if let Err(e) = fs::remove_file(&path) {
                        log::warn!("删除旧更新文件失败: {} - {}", path.display(), e);
                    } else {
                        log::info!("已删除旧更新文件: {}", path.display());
                    }
                }
            }
        }
    }

    Ok(())
}

// 获取更新文件存储目录
fn get_updates_directory() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("无法获取应用数据目录")?;

    let updates_dir = app_data_dir.join("WorkHelper").join("updates");

    // 确保目录存在
    if !updates_dir.exists() {
        fs::create_dir_all(&updates_dir)
            .map_err(|e| format!("创建更新目录失败: {}", e))?;
    }

    Ok(updates_dir)
}

// 格式化下载速度
fn format_speed(bytes_per_second: f64) -> String {
    if bytes_per_second < 1024.0 {
        format!("{:.1} B/s", bytes_per_second)
    } else if bytes_per_second < 1024.0 * 1024.0 {
        format!("{:.1} KB/s", bytes_per_second / 1024.0)
    } else {
        format!("{:.1} MB/s", bytes_per_second / (1024.0 * 1024.0))
    }
}

// 格式化剩余时间
fn format_time(seconds: f64) -> String {
    if seconds < 60.0 {
        format!("{:.0}s", seconds)
    } else if seconds < 3600.0 {
        format!("{:.0}m {:.0}s", seconds / 60.0, seconds % 60.0)
    } else {
        format!("{:.0}h {:.0}m", seconds / 3600.0, (seconds % 3600.0) / 60.0)
    }
}

// Tauri 命令：通用HTTP请求
// 使用reqwest库发送HTTP请求，解决跨域问题
#[tauri::command]
async fn http_request(
    url: String,
    method: String,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // 构建请求
    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("不支持的HTTP方法".to_string()),
    };

    // 添加请求头
    if let Some(headers) = headers {
        for (key, value) in headers {
            request = request.header(&key, &value);
        }
    }

    // 添加请求体
    if let Some(body) = body {
        request = request.body(body);
    }

    // 发送请求
    match request.send().await {
        Ok(response) => {
            match response.text().await {
                Ok(text) => {
                    Ok(text)
                }
                Err(e) => {
                    log::error!("读取响应失败: {}", e);
                    Err(format!("读取响应失败: {}", e))
                }
            }
        }
        Err(e) => {
            log::error!("HTTP请求失败: {}", e);
            Err(format!("HTTP请求失败: {}", e))
        }
    }
}



// Tauri 命令：关闭启动画面并显示主窗口
#[tauri::command]
async fn close_splashscreen(app: tauri::AppHandle) -> Result<(), String> {
    // 先显示主窗口，确保无缝切换
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|e| {
            log::error!("显示主窗口失败: {}", e);
            e.to_string()
        })?;

        // 确保主窗口获得焦点
        main_window.set_focus().map_err(|e| {
            log::warn!("设置主窗口焦点失败: {}", e);
            e.to_string()
        })?;
    }

    // 稍微延迟后关闭启动画面，确保主窗口已完全显示
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // 获取启动画面窗口并关闭
    if let Some(splashscreen) = app.get_webview_window("splashscreen") {
        splashscreen.close().map_err(|e| {
            log::error!("关闭启动画面失败: {}", e);
            e.to_string()
        })?;

    }

    Ok(())
}

// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 在应用启动时加载环境变量
    if let Err(e) = dotenv::dotenv() {
        println!("警告：无法加载 .env 文件: {}", e);
    } else {
        println!("✅ 成功加载 .env 文件");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 在生产环境也启用日志，方便调试
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            println!("工作助手应用程序启动成功");
                log::info!("WorkHelper 启动成功 - 版本: {}", env!("CARGO_PKG_VERSION"));

            // 创建启动画面窗口 - 在主窗口加载前先显示
            let splashscreen_window = tauri::WebviewWindowBuilder::new(
                app,
                "splashscreen", // 窗口标识符
                tauri::WebviewUrl::App("splash-simple.html".into()) // 启动画面HTML文件
            )
            .title("工作助手 - 启动中") // 窗口标题
            .inner_size(400.0, 300.0) // 窗口大小：400x300像素
            .resizable(false) // 禁止调整大小
            .decorations(false) // 无边框
            .center() // 居中显示
            .always_on_top(true) // 置顶显示
            .skip_taskbar(true) // 不在任务栏显示
            .build();

            // 处理启动画面窗口创建结果
            match splashscreen_window {
                Ok(_) => {
        
                    println!("启动画面窗口创建成功");
                }
                Err(e) => {
                    log::error!("创建启动画面窗口失败: {}", e);
                    println!("创建启动画面窗口失败: {}", e);
                }
            }

            // 主窗口保持隐藏状态，等待前端完全加载完成
            if let Some(main_window) = app.get_webview_window("main") {
    
                println!("主窗口已创建但保持隐藏");

                // 确保主窗口隐藏，避免与启动画面同时显示
                if let Err(e) = main_window.hide() {
                    log::warn!("隐藏主窗口失败: {}", e);
                }
            } else {
                log::error!("未找到主窗口");
                println!("未找到主窗口");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_directory,
            run_git_log,
            get_app_version,
            window_minimize,
            window_close,
            health_check,
            close_splashscreen,
            http_request,
            check_for_updates,
            download_update,
            cancel_download,
            install_update_and_restart,
            get_downloaded_update_path,
            cleanup_old_updates
        ])
        .run(tauri::generate_context!())
        .expect("运行Tauri应用程序时出错");
}
