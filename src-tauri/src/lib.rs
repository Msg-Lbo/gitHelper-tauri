use std::process::Command;

// Tauri 命令：选择目录 (暂时禁用，需要 dialog 插件)
// #[tauri::command]
// async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
//     use tauri_plugin_dialog::DialogExt;
//     use std::sync::{Arc, Mutex};
//     use tokio::sync::oneshot;
//
//     let (tx, rx) = oneshot::channel();
//     let tx = Arc::new(Mutex::new(Some(tx)));
//
//     app.dialog().file().pick_folder(move |folder_path| {
//         if let Ok(mut sender) = tx.lock() {
//             if let Some(tx) = sender.take() {
//                 let _ = tx.send(folder_path);
//             }
//         }
//     });
//
//     match rx.await {
//         Ok(Some(path)) => Ok(Some(path.to_string())),
//         Ok(None) => Ok(None),
//         Err(_) => Err("Failed to receive folder selection result".to_string()),
//     }
// }

// Tauri 命令：执行 Git 命令
#[tauri::command]
async fn run_git_log(command: String, project_path: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("cd /d \"{}\" && {}", project_path, command)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("cd \"{}\" && export LANG=zh_CN.UTF-8 && {}", project_path, command)])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                Ok(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_git_log,
            get_app_version,
            window_minimize,
            window_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
