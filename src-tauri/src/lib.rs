use std::process::Command;

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

// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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

            log::info!("Git Helper 应用程序启动成功");
            log::info!("版本: {}", env!("CARGO_PKG_VERSION"));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_directory,
            run_git_log,
            get_app_version,
            window_minimize,
            window_close,
            health_check
        ])
        .run(tauri::generate_context!())
        .expect("运行Tauri应用程序时出错");
}
