fn main() {
    // 监听环境变量变化，确保重新构建
    println!("cargo:rerun-if-env-changed=WEBDAV_URL");
    println!("cargo:rerun-if-env-changed=WEBDAV_USERNAME");
    println!("cargo:rerun-if-env-changed=WEBDAV_PASSWORD");
    println!("cargo:rerun-if-env-changed=WEBDAV_REMOTE_PATH");
    println!("cargo:rerun-if-env-changed=WEBDAV_BASE_URL");

    // Tauri 构建
    tauri_build::build()
}
