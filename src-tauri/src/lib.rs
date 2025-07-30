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

// Tauri 命令：显示启动画面
#[tauri::command]
async fn show_splashscreen(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("显示启动画面");

    if let Some(splashscreen) = app.get_webview_window("splashscreen") {
        splashscreen.show().map_err(|e| {
            log::error!("显示启动画面失败: {}", e);
            e.to_string()
        })?;
        log::info!("启动画面已显示");
    }

    Ok(())
}

// Tauri 命令：关闭启动画面并显示主窗口
#[tauri::command]
async fn close_splashscreen(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("准备关闭启动画面并显示主窗口");

    // 获取启动画面窗口
    if let Some(splashscreen) = app.get_webview_window("splashscreen") {
        // 关闭启动画面
        splashscreen.close().map_err(|e| {
            log::error!("关闭启动画面失败: {}", e);
            e.to_string()
        })?;
        log::info!("启动画面已关闭");
    }

    // 获取主窗口并显示
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

    Ok(())
}

// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // 在生产环境也启用日志，方便调试
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(if cfg!(debug_assertions) {
                        log::LevelFilter::Debug
                    } else {
                        log::LevelFilter::Info
                    })
                    .build(),
            )?;

            log::info!("工作助手应用程序启动成功");
            log::info!("版本: {}", env!("CARGO_PKG_VERSION"));

            // 记录窗口初始化信息
            if let Some(_splashscreen) = app.get_webview_window("splashscreen") {
                log::info!("启动画面窗口已创建（隐藏状态）");
            }

            if let Some(_main_window) = app.get_webview_window("main") {
                log::info!("主窗口已创建（隐藏状态）");
            }

            // 延迟显示启动画面，确保内容已准备好
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(100));
                if let Err(e) = tauri::async_runtime::block_on(show_splashscreen(app_handle)) {
                    log::error!("显示启动画面失败: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_directory,
            run_git_log,
            get_app_version,
            window_minimize,
            window_close,
            health_check,
            show_splashscreen,
            close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("运行Tauri应用程序时出错");
}
