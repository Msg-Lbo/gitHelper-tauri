use std::process::Command;
use tauri::Manager;

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

// Tauri 命令：健康检查
#[tauri::command]
fn health_check() -> Result<String, String> {
    log::info!("应用程序健康检查");
    Ok("应用程序运行正常".to_string())
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
    log::info!("HTTP请求: {} {}", method, url);

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
                    log::info!("HTTP请求成功，响应长度: {}", text.len());
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
    log::info!("准备关闭启动画面并显示主窗口");

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

        log::info!("主窗口已显示并获得焦点");
    }

    // 稍微延迟后关闭启动画面，确保主窗口已完全显示
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // 获取启动画面窗口并关闭
    if let Some(splashscreen) = app.get_webview_window("splashscreen") {
        splashscreen.close().map_err(|e| {
            log::error!("关闭启动画面失败: {}", e);
            e.to_string()
        })?;
        log::info!("启动画面已关闭");
    }

    Ok(())
}

// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            log::info!("工作助手应用程序启动成功");
            log::info!("版本: {}", env!("CARGO_PKG_VERSION"));

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
                    log::info!("启动画面窗口创建成功");
                    println!("启动画面窗口创建成功");
                }
                Err(e) => {
                    log::error!("创建启动画面窗口失败: {}", e);
                    println!("创建启动画面窗口失败: {}", e);
                }
            }

            // 主窗口保持隐藏状态，等待前端完全加载完成
            if let Some(main_window) = app.get_webview_window("main") {
                log::info!("主窗口已创建但保持隐藏");
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
            http_request
        ])
        .run(tauri::generate_context!())
        .expect("运行Tauri应用程序时出错");
}
