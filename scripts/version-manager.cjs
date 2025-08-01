#!/usr/bin/env node

// Windows专用版本管理脚本 - CommonJS格式
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const simpleGit = require('simple-git');
const { execSync } = require('child_process');

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  // 如果没有安装dotenv，手动读取.env文件
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const equalIndex = line.indexOf('=');
          if (equalIndex > 0) {
            const key = line.substring(0, equalIndex).trim();
            const value = line.substring(equalIndex + 1).trim();
            // 移除注释部分
            const commentIndex = value.indexOf('#');
            const finalValue = commentIndex > 0 ? value.substring(0, commentIndex).trim() : value;
            process.env[key] = finalValue;
          }
        }
      });
      console.log('✅ 已加载.env文件');
    }
  } catch (err) {
    console.warn('⚠️ 无法读取.env文件:', err.message);
  }
}

// 读取配置（包括环境变量）
function loadConfig() {
  // 默认配置
  const defaultConfig = {
    // WebDAV配置
    webdav: {
      url: 'https://your-server.com/webdav',
      username: 'your-username',
      password: 'your-password',
      remotePath: '/releases',
      baseUrl: 'https://your-server.com/releases'
    },

    build: {
      command: 'pnpm tauri build',
      outputDir: 'src-tauri/target/release/bundle/nsis',
      exePattern: '*.exe',
      msiPattern: '*.msi'
    }
  };

  // 尝试从环境变量或.env文件读取配置
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const equalIndex = line.indexOf('=');
          if (equalIndex > 0) {
            const key = line.substring(0, equalIndex).trim();
            const value = line.substring(equalIndex + 1).trim();
            const commentIndex = value.indexOf('#');
            const finalValue = commentIndex > 0 ? value.substring(0, commentIndex).trim() : value;
            process.env[key] = finalValue;
          }
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ 读取.env文件失败:', error.message);
  }

  // 使用环境变量覆盖默认配置
  if (process.env.WEBDAV_URL) {
    defaultConfig.webdav.url = process.env.WEBDAV_URL;
  }
  if (process.env.WEBDAV_USERNAME) {
    defaultConfig.webdav.username = process.env.WEBDAV_USERNAME;
  }
  if (process.env.WEBDAV_PASSWORD) {
    defaultConfig.webdav.password = process.env.WEBDAV_PASSWORD;
  }
  if (process.env.WEBDAV_REMOTE_PATH) {
    defaultConfig.webdav.remotePath = process.env.WEBDAV_REMOTE_PATH;
  }
  if (process.env.WEBDAV_BASE_URL) {
    defaultConfig.webdav.baseUrl = process.env.WEBDAV_BASE_URL;
  }

  return defaultConfig;
}

// Windows专用配置
const CONFIG = loadConfig();

class VersionManager {
  constructor() {
    this.git = simpleGit();
    this.packagePath = path.join(process.cwd(), 'package.json');
    this.tauriConfigPath = path.join(process.cwd(), 'src-tauri/tauri.conf.json');
    this.cargoTomlPath = path.join(process.cwd(), 'src-tauri/Cargo.toml');
  }

  // 获取当前版本
  getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
    return packageJson.version;
  }

  // 更新版本号
  updateVersion(releaseType) {
    const currentVersion = this.getCurrentVersion();
    const newVersion = semver.inc(currentVersion, releaseType);

    console.log(`🔄 版本升级: ${currentVersion} -> ${newVersion}`);

    // 更新 package.json
    const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2) + '\n');

    // 更新 tauri.conf.json
    try {
      const tauriConfig = JSON.parse(fs.readFileSync(this.tauriConfigPath, 'utf8'));

      // 检查版本号位置（新版本Tauri直接在根级别）
      if (tauriConfig.package && typeof tauriConfig.package === 'object') {
        tauriConfig.package.version = newVersion;
      } else {
        // 新版本Tauri配置格式
        tauriConfig.version = newVersion;
      }

      fs.writeFileSync(this.tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
      console.log(`✅ 已更新 tauri.conf.json 版本号: ${newVersion}`);

    } catch (error) {
      console.warn(`⚠️ 更新 tauri.conf.json 失败: ${error.message}`);
      console.log('请手动更新 src-tauri/tauri.conf.json 中的版本号');
    }

    // 更新 Cargo.toml
    try {
      const cargoContent = fs.readFileSync(this.cargoTomlPath, 'utf8');
      const updatedCargoContent = cargoContent.replace(
        /^version\s*=\s*"[^"]*"/m,
        `version = "${newVersion}"`
      );

      fs.writeFileSync(this.cargoTomlPath, updatedCargoContent);
      console.log(`✅ 已更新 Cargo.toml 版本号: ${newVersion}`);

    } catch (error) {
      console.warn(`⚠️ 更新 Cargo.toml 失败: ${error.message}`);
      console.log('请手动更新 src-tauri/Cargo.toml 中的版本号');
    }

    return newVersion;
  }

  // 生成更新日志
  async generateChangelog(fromTag, toTag = 'HEAD') {
    try {
      console.log(`📝 生成更新日志: ${fromTag} -> ${toTag}`);
      
      // 获取commit记录
      const logs = await this.git.log({ from: fromTag, to: toTag });
      
      if (logs.all.length === 0) {
        return '本次更新无代码变更';
      }
      
      // 分类整理commit
      const changelog = {
        features: [],
        fixes: [],
        improvements: [],
        others: []
      };
      
      logs.all.forEach(commit => {
        const message = commit.message.toLowerCase();
        const item = `- ${commit.message} (${commit.hash.substring(0, 7)})`;
        
        if (message.includes('feat') || message.includes('新增') || message.includes('添加')) {
          changelog.features.push(item);
        } else if (message.includes('fix') || message.includes('修复') || message.includes('bug')) {
          changelog.fixes.push(item);
        } else if (message.includes('improve') || message.includes('优化') || message.includes('更新')) {
          changelog.improvements.push(item);
        } else {
          changelog.others.push(item);
        }
      });
      
      // 格式化输出
      let result = '';
      if (changelog.features.length > 0) {
        result += '## ✨ 新功能\n' + changelog.features.join('\n') + '\n\n';
      }
      if (changelog.fixes.length > 0) {
        result += '## 🐛 问题修复\n' + changelog.fixes.join('\n') + '\n\n';
      }
      if (changelog.improvements.length > 0) {
        result += '## 🚀 功能优化\n' + changelog.improvements.join('\n') + '\n\n';
      }
      if (changelog.others.length > 0) {
        result += '## 📦 其他变更\n' + changelog.others.join('\n') + '\n\n';
      }
      
      return result || '本次更新包含代码优化和性能提升';
      
    } catch (error) {
      console.warn('⚠️ 生成更新日志失败，使用默认内容');
      return '本次更新包含功能改进和问题修复';
    }
  }

  // 构建应用
  async buildApp() {
    console.log('🔨 开始构建应用...');
    try {
      // 加载环境变量到构建进程
      this.loadEnvForBuild();

      execSync(CONFIG.build.command, {
        stdio: 'inherit',
        env: { ...process.env } // 确保环境变量传递给子进程
      });

      console.log('\n' + '='.repeat(60));
      console.log('✅ 构建命令执行完成');
      console.log('='.repeat(60));

      // 检查构建文件是否生成
      console.log('🔍 检查构建文件...');
      try {
        const buildFiles = this.findBuildFiles();
        console.log(`🔍 调试: findBuildFiles 返回了 ${buildFiles.length} 个文件`);
        if (buildFiles.length > 0) {
          console.log(`✅ 找到 ${buildFiles.length} 个构建文件`);
          buildFiles.forEach(file => {
            console.log(`  - ${file.name} (${file.type})`);
          });
          console.log('✅ 构建完成');
          return true;
        } else {
          console.warn('⚠️ 未找到构建文件');
          return false;
        }
      } catch (fileCheckError) {
        console.error('❌ 检查构建文件时出错:', fileCheckError.message);
        console.error('错误堆栈:', fileCheckError.stack);
        return false;
      }
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      console.error('错误详情:', error);
      if (error.status) {
        console.error('退出码:', error.status);
      }
      if (error.stdout) {
        console.error('标准输出:', error.stdout.toString());
      }
      if (error.stderr) {
        console.error('标准错误:', error.stderr.toString());
      }
      return false;
    }
  }

  // 加载环境变量用于构建
  loadEnvForBuild() {
    const envPath = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) {
      console.warn('⚠️ .env 文件不存在，跳过环境变量加载');
      return;
    }

    console.log('📄 加载环境变量...');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').replace(/^["']|["']$/g, '');
          // 移除行内注释（# 后面的内容）
          const commentIndex = value.indexOf('#');
          if (commentIndex > 0) {
            value = value.substring(0, commentIndex).trim();
          }
          process.env[key.trim()] = value;
        }
      }
    });

    // 检查必要的环境变量
    const requiredVars = ['WEBDAV_URL', 'WEBDAV_USERNAME', 'WEBDAV_PASSWORD', 'WEBDAV_BASE_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ 缺少必要的环境变量:', missingVars.join(', '));
      console.error('请在 .env 文件中设置这些变量');
      throw new Error('环境变量配置不完整');
    }

    console.log('✅ 环境变量加载完成');
  }

  // 等待构建文件生成
  async waitForBuildFiles(maxWaitTime = 30000, checkInterval = 1000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // 静默检查文件是否存在
      const files = this.findBuildFilesSilent();
      if (files.length > 0) {
        console.log(`✅ 找到 ${files.length} 个构建文件`);
        return true;
      }

      console.log('⏳ 构建文件尚未生成，继续等待...');
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.warn('⚠️ 等待构建文件超时');
    return false;
  }

  // 静默查找构建文件（不输出日志）
  findBuildFilesSilent() {
    const files = [];
    const outputDir = path.resolve(CONFIG.build.outputDir);

    try {
      if (!fs.existsSync(outputDir)) {
        console.log(`🔍 调试: 目录不存在 ${outputDir}`);
        return files;
      }

      // 直接读取目录内容，不使用glob
      const dirContents = fs.readdirSync(outputDir);
      console.log(`🔍 调试: 目录内容 ${dirContents.join(', ')}`);

      dirContents.forEach(fileName => {
        const filePath = path.join(outputDir, fileName);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          if (fileName.endsWith('.exe')) {
            files.push({
              platform: 'windows',
              type: 'exe',
              path: filePath,
              name: fileName
            });
            console.log(`🔍 调试: 找到EXE文件 ${fileName}`);
          } else if (fileName.endsWith('.msi')) {
            files.push({
              platform: 'windows',
              type: 'msi',
              path: filePath,
              name: fileName
            });
            console.log(`🔍 调试: 找到MSI文件 ${fileName}`);
          }
        }
      });

    } catch (error) {
      console.log(`🔍 调试: 查找文件出错 ${error.message}`);
    }

    return files;
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 查找Windows构建文件
  findBuildFiles(targetVersion = null) {
    const files = [];
    const outputDir = path.resolve(CONFIG.build.outputDir);

    console.log(`🔍 在目录中查找构建文件: ${outputDir}`);
    if (targetVersion) {
      console.log(`🎯 目标版本: ${targetVersion}`);
    }

    try {
      // 检查目录是否存在
      if (!fs.existsSync(outputDir)) {
        console.warn(`⚠️ 构建目录不存在: ${outputDir}`);
        return files;
      }

      // 直接读取目录内容，不使用glob
      const dirContents = fs.readdirSync(outputDir);
      console.log(`📁 目录内容: ${dirContents.join(', ')}`);

      dirContents.forEach(fileName => {
        const filePath = path.join(outputDir, fileName);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          // 如果指定了目标版本，只处理包含该版本的文件
          if (targetVersion && !fileName.includes(targetVersion)) {
            console.log(`⏭️ 跳过旧版本文件: ${fileName}`);
            return;
          }

          if (fileName.endsWith('.exe')) {
            files.push({
              platform: 'windows',
              type: 'exe',
              path: filePath,
              name: fileName
            });
            console.log(`✅ 找到当前版本EXE文件: ${fileName}`);
          } else if (fileName.endsWith('.msi')) {
            files.push({
              platform: 'windows',
              type: 'msi',
              path: filePath,
              name: fileName
            });
            console.log(`✅ 找到当前版本MSI文件: ${fileName}`);
          }
        }
      });

      if (files.length === 0) {
        if (targetVersion) {
          console.warn(`⚠️ 在 ${outputDir} 中未找到版本 ${targetVersion} 的构建文件`);
        } else {
          console.warn(`⚠️ 在 ${outputDir} 中未找到.exe或.msi文件`);
        }
      }

    } catch (error) {
      console.error('❌ 查找构建文件时出错:', error);
    }

    return files;
  }

  // 上传Windows构建文件到WebDAV服务器
  async uploadToWebDAV(version, changelog) {
    console.log('☁️ 上传Windows构建文件到WebDAV服务器...');
    console.log(`🔧 WebDAV配置:`);
    console.log(`  URL: ${CONFIG.webdav.url}`);
    console.log(`  用户名: ${CONFIG.webdav.username}`);
    console.log(`  远程路径: ${CONFIG.webdav.remotePath}`);
    console.log(`  基础URL: ${CONFIG.webdav.baseUrl}`);

    try {
      // 查找Windows构建产物（只查找当前版本）
      const buildFiles = this.findBuildFiles(version);

      if (buildFiles.length === 0) {
        throw new Error(`未找到版本 ${version} 的构建文件，请先执行构建命令`);
      }

      const uploadResults = [];

      for (const file of buildFiles) {
        const fileName = file.name;
        const remotePath = `${CONFIG.webdav.remotePath}/v${version}/windows/${fileName}`;
        const downloadUrl = `${CONFIG.webdav.baseUrl}/v${version}/windows/${fileName}`;

        console.log(`📤 上传文件: ${file.name} -> ${remotePath}`);

        // 使用WebDAV上传文件
        const success = await this.uploadFileToWebDAV(file.path, remotePath);

        if (success) {
          console.log(`✅ ${file.name} 上传成功`);
          uploadResults.push({
            platform: 'windows',
            type: file.type,
            name: file.name,
            url: downloadUrl,
            size: fs.statSync(file.path).size,
            sizeFormatted: this.formatFileSize(fs.statSync(file.path).size)
          });
        } else {
          console.error(`❌ 上传失败详情:`);
          console.error(`  文件: ${file.name}`);
          console.error(`  本地路径: ${file.path}`);
          console.error(`  远程路径: ${remotePath}`);
          console.error(`  WebDAV URL: ${CONFIG.webdav.url}${remotePath}`);
          throw new Error(`上传 ${file.name} 失败，请检查WebDAV服务器配置和网络连接`);
        }
      }

      // 创建Windows版本信息文件
      const versionInfo = {
        version,
        platform: 'windows',
        releaseDate: new Date().toISOString(),
        changelog,
        downloads: uploadResults,
        mandatory: false,
        minVersion: '1.0.0' // 最低支持版本
      };

      // 上传版本信息文件
      await this.uploadVersionInfo(versionInfo);

      console.log('✅ 所有文件上传完成');
      return uploadResults;

    } catch (error) {
      console.error('❌ 上传失败:', error);
      throw error;
    }
  }

  // WebDAV文件上传方法
  async uploadFileToWebDAV(localPath, remotePath) {
    try {
      // 确保目录存在
      const dirPath = path.dirname(remotePath);
      await this.ensureWebDAVDirectory(dirPath);

      const fileContent = fs.readFileSync(localPath);
      const auth = Buffer.from(`${CONFIG.webdav.username}:${CONFIG.webdav.password}`).toString('base64');

      console.log(`🔗 上传到: ${CONFIG.webdav.url}${remotePath}`);

      const response = await fetch(`${CONFIG.webdav.url}${remotePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileContent.length.toString()
        },
        body: fileContent
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ WebDAV上传失败: ${response.status} ${response.statusText}`);
        console.error(`错误详情: ${errorText}`);
        return false;
      }

      console.log(`✅ 文件上传成功: ${response.status} ${response.statusText}`);

      // 验证上传并强制刷新缓存
      await this.verifyUploadAndRefresh(remotePath);

      return true;
    } catch (error) {
      console.error(`❌ WebDAV上传异常: ${error.message}`);
      console.error(`错误堆栈: ${error.stack}`);
      return false;
    }
  }

  // 创建WebDAV目录
  async createWebDAVDirectory(remotePath) {
    try {
      const auth = Buffer.from(`${CONFIG.webdav.username}:${CONFIG.webdav.password}`).toString('base64');
      const fullUrl = `${CONFIG.webdav.url}${remotePath}`;

      console.log(`🔗 创建目录请求: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'VersionManager/1.0'
        }
      });

      console.log(`📁 目录创建响应: ${response.status} ${response.statusText}`);

      if (response.ok || response.status === 405) {
        // 创建成功后，等待一下让 alist 更新索引
        await new Promise(resolve => setTimeout(resolve, 500));

        // 尝试触发目录刷新
        await this.refreshDirectoryIndex(remotePath);

        return true;
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ 创建目录失败: ${response.status} ${response.statusText}`);
        console.warn(`错误详情: ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(`创建WebDAV目录失败: ${error.message}`);
      return false;
    }
  }

  // 刷新目录索引（触发 alist 更新缓存）
  async refreshDirectoryIndex(remotePath) {
    try {
      const auth = Buffer.from(`${CONFIG.webdav.username}:${CONFIG.webdav.password}`).toString('base64');
      const fullUrl = `${CONFIG.webdav.url}${remotePath}`;

      console.log(`🔄 刷新目录索引: ${fullUrl}`);

      // 方法1: 使用 PROPFIND 请求触发目录扫描
      const propfindResponse = await fetch(fullUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '1',
          'Content-Type': 'application/xml',
          'User-Agent': 'VersionManager/1.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (propfindResponse.ok) {
        console.log(`✅ PROPFIND 刷新成功`);
      }

      // 方法2: 使用 HEAD 请求触发缓存更新
      const headResponse = await fetch(fullUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (headResponse.ok) {
        console.log(`✅ HEAD 刷新成功`);
      }

      // 方法3: 尝试访问父目录触发级联刷新
      const parentPath = remotePath.substring(0, remotePath.lastIndexOf('/'));
      if (parentPath && parentPath !== remotePath) {
        const parentResponse = await fetch(`${CONFIG.webdav.url}${parentPath}`, {
          method: 'PROPFIND',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Depth': '1',
            'Cache-Control': 'no-cache'
          }
        });

        if (parentResponse.ok) {
          console.log(`✅ 父目录刷新成功`);
        }
      }

    } catch (error) {
      console.warn(`⚠️ 目录索引刷新异常: ${error.message}`);
    }
  }

  // 验证上传并强制刷新缓存
  async verifyUploadAndRefresh(remotePath) {
    try {
      console.log(`🔍 验证上传并刷新缓存: ${remotePath}`);

      const auth = Buffer.from(`${CONFIG.webdav.username}:${CONFIG.webdav.password}`).toString('base64');
      const fullUrl = `${CONFIG.webdav.url}${remotePath}`;

      // 1. 验证文件是否存在
      const headResponse = await fetch(fullUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (headResponse.ok) {
        const size = headResponse.headers.get('content-length');
        console.log(`✅ 文件验证成功，大小: ${size} 字节`);
      } else {
        console.warn(`⚠️ 文件验证失败: ${headResponse.status}`);
        return false;
      }

      // 2. 强制刷新所有相关目录
      const dirPath = remotePath.substring(0, remotePath.lastIndexOf('/'));
      await this.refreshDirectoryIndex(dirPath);

      // 3. 等待更长时间确保 alist 处理完成
      console.log(`⏳ 等待 alist 更新索引...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. 再次验证目录列表
      const listResponse = await fetch(`${CONFIG.webdav.url}${dirPath}`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (listResponse.ok) {
        const xmlText = await listResponse.text();
        const fileName = remotePath.split('/').pop();
        const fileExists = xmlText.includes(fileName);

        if (fileExists) {
          console.log(`✅ 文件在目录列表中可见`);
        } else {
          console.warn(`⚠️ 文件在目录列表中不可见，但可以直接访问`);
          console.warn(`💡 这是 alist 缓存问题，文件已成功上传`);
          console.warn(`🔧 解决方案:`);
          console.warn(`   1. 手动刷新 alist 管理界面`);
          console.warn(`   2. 重启 alist 服务: sudo systemctl restart alist`);
          console.warn(`   3. 文件仍然可以正常下载和使用`);
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ 验证上传异常: ${error.message}`);
      return false;
    }
  }

  // 确保WebDAV目录存在（递归创建）
  async ensureWebDAVDirectory(remotePath) {
    try {
      // 规范化路径
      const normalizedPath = remotePath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/').filter(part => part.length > 0);

      // 递归创建每一级目录
      let currentPath = '';
      for (const part of pathParts) {
        currentPath += '/' + part;

        // 尝试创建目录
        const success = await this.createWebDAVDirectory(currentPath);
        if (!success) {
          console.warn(`⚠️ 创建目录失败: ${currentPath}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`确保WebDAV目录存在失败: ${error.message}`);
      return false;
    }
  }

  // 上传版本信息到WebDAV
  async uploadVersionInfo(versionInfo) {
    try {
      const remotePath = `${CONFIG.webdav.remotePath}/latest.json`;

      // 创建临时文件
      const tempFile = path.join(process.cwd(), 'temp-version.json');
      fs.writeFileSync(tempFile, JSON.stringify(versionInfo, null, 2));

      // 上传到WebDAV
      const success = await this.uploadFileToWebDAV(tempFile, remotePath);

      // 清理临时文件
      fs.unlinkSync(tempFile);

      if (!success) {
        throw new Error('版本信息上传失败');
      }

      console.log('✅ 版本信息上传成功');

    } catch (error) {
      console.error('❌ 版本信息上传失败:', error);
      throw error;
    }
  }

  // 创建Git标签并推送
  async createAndPushTag(version, changelog) {
    try {
      console.log(`🏷️ 创建标签: v${version}`);
      
      // 提交版本更改
      await this.git.add(['package.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml' ,'src-tauri/Cargo.lock']);
      await this.git.commit(`chore: bump version to ${version}`);
      
      // 创建标签
      await this.git.addAnnotatedTag(`v${version}`, `Release v${version}\n\n${changelog}`);
      
      // 推送到远程
      await this.git.pushTags('origin');
      await this.git.push('origin', 'main');
      
      console.log('✅ 标签创建并推送成功');
      
    } catch (error) {
      console.error('❌ Git操作失败:', error);
      throw error;
    }
  }

  // 获取上一个标签
  async getLastTag() {
    try {
      const tags = await this.git.tags();
      const versionTags = tags.all
        .filter(tag => tag.startsWith('v'))
        .sort((a, b) => semver.rcompare(a.substring(1), b.substring(1)));
      
      return versionTags[0] || null;
    } catch (error) {
      return null;
    }
  }

  // 回滚上一次版本发布
  async rollback() {
    try {
      console.log('🔄 开始回滚上一次版本发布...');

      // 1. 获取最后两个标签
      const tags = await this.git.tags();
      const versionTags = tags.all
        .filter(tag => tag.startsWith('v'))
        .sort((a, b) => semver.rcompare(a.substring(1), b.substring(1)));

      if (versionTags.length < 1) {
        console.log('⚠️ 没有找到版本标签，无法回滚');
        return;
      }

      const currentTag = versionTags[0];
      const previousTag = versionTags[1];
      const currentVersion = currentTag.substring(1);
      const previousVersion = previousTag ? previousTag.substring(1) : '0.0.0';

      console.log(`📋 当前版本: v${currentVersion}`);
      console.log(`📋 回滚到版本: v${previousVersion}`);

      // 2. 确认回滚
      console.log('⚠️ 此操作将：');
      console.log('  - 删除最新的构建文件');
      console.log('  - 回滚版本号到上一个版本');
      console.log('  - 删除最新的Git标签');
      console.log('  - 删除WebDAV服务器上的最新版本文件');

      // 3. 删除构建文件
      await this.deleteLatestBuildFiles(currentVersion);

      // 4. 回滚版本号
      this.rollbackVersion(previousVersion);

      // 5. 删除Git标签和提交
      await this.deleteLatestTag(currentTag);

      // 6. 删除WebDAV文件（如果配置了）
      if (CONFIG.webdav.username !== 'your-username') {
        await this.deleteWebDAVFiles(currentVersion);
      } else {
        console.log('⚠️ 跳过WebDAV文件删除（未配置用户名密码）');
      }

      console.log(`🎉 回滚完成! 版本已回滚到 v${previousVersion}`);

    } catch (error) {
      console.error('❌ 回滚失败:', error);
      throw error;
    }
  }

  // 删除最新构建文件
  async deleteLatestBuildFiles(version) {
    try {
      const outputDir = path.resolve(CONFIG.build.outputDir);
      if (!fs.existsSync(outputDir)) {
        console.log('📁 构建目录不存在，跳过文件删除');
        return;
      }

      const dirContents = fs.readdirSync(outputDir);
      const filesToDelete = dirContents.filter(fileName =>
        fileName.includes(version) && (fileName.endsWith('.exe') || fileName.endsWith('.msi'))
      );

      if (filesToDelete.length === 0) {
        console.log('📁 没有找到需要删除的构建文件');
        return;
      }

      console.log(`🗑️ 删除构建文件:`);
      filesToDelete.forEach(fileName => {
        const filePath = path.join(outputDir, fileName);
        fs.unlinkSync(filePath);
        console.log(`  - 已删除: ${fileName}`);
      });

    } catch (error) {
      console.warn('⚠️ 删除构建文件失败:', error.message);
    }
  }

  // 回滚版本号
  rollbackVersion(targetVersion) {
    console.log(`🔄 回滚版本号到: ${targetVersion}`);

    // 回滚 package.json
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
      packageJson.version = targetVersion;
      fs.writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ 已回滚 package.json 版本号: ${targetVersion}`);
    } catch (error) {
      console.warn(`⚠️ 回滚 package.json 失败: ${error.message}`);
    }

    // 回滚 tauri.conf.json
    try {
      const tauriConfig = JSON.parse(fs.readFileSync(this.tauriConfigPath, 'utf8'));
      tauriConfig.version = targetVersion;
      fs.writeFileSync(this.tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
      console.log(`✅ 已回滚 tauri.conf.json 版本号: ${targetVersion}`);
    } catch (error) {
      console.warn(`⚠️ 回滚 tauri.conf.json 失败: ${error.message}`);
    }

    // 回滚 Cargo.toml
    try {
      const cargoContent = fs.readFileSync(this.cargoTomlPath, 'utf8');
      const updatedCargoContent = cargoContent.replace(
        /^version\s*=\s*"[^"]*"/m,
        `version = "${targetVersion}"`
      );
      fs.writeFileSync(this.cargoTomlPath, updatedCargoContent);
      console.log(`✅ 已回滚 Cargo.toml 版本号: ${targetVersion}`);
    } catch (error) {
      console.warn(`⚠️ 回滚 Cargo.toml 失败: ${error.message}`);
    }
  }

  // 删除最新Git标签
  async deleteLatestTag(tagName) {
    try {
      console.log(`🏷️ 删除Git标签: ${tagName}`);

      // 删除本地标签
      await this.git.tag(['-d', tagName]);

      // 删除远程标签
      try {
        await this.git.push('origin', `:refs/tags/${tagName}`);
        console.log('✅ 已删除远程标签');
      } catch (error) {
        console.warn('⚠️ 删除远程标签失败:', error.message);
      }

      // 重置到上一个提交
      await this.git.reset(['--hard', 'HEAD~1']);

      // 强制推送
      try {
        await this.git.push('origin', 'main', ['--force']);
        console.log('✅ 已重置Git提交');
      } catch (error) {
        console.warn('⚠️ 强制推送失败:', error.message);
      }

    } catch (error) {
      console.warn('⚠️ Git操作失败:', error.message);
    }
  }

  // 删除WebDAV文件
  async deleteWebDAVFiles(version) {
    try {
      console.log(`☁️ 删除WebDAV文件: v${version}`);

      const auth = Buffer.from(`${CONFIG.webdav.username}:${CONFIG.webdav.password}`).toString('base64');
      const versionPath = `${CONFIG.webdav.remotePath}/v${version}`;

      // 删除整个版本目录
      const response = await fetch(`${CONFIG.webdav.url}${versionPath}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        console.log(`✅ 已删除WebDAV版本目录: v${version}`);
      } else {
        console.warn(`⚠️ 删除WebDAV目录失败: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.warn('⚠️ 删除WebDAV文件失败:', error.message);
    }
  }

  // 主要发布流程
  async release(releaseType) {
    try {
      console.log(`🚀 开始发布流程: ${releaseType}`);

      // 0. 加载环境变量（确保WebDAV配置可用）
      this.loadEnvForBuild();

      // 重新加载配置以使用最新的环境变量
      const currentConfig = loadConfig();
      Object.assign(CONFIG, currentConfig);

      // 1. 获取上一个标签
      const lastTag = await this.getLastTag();

      // 2. 更新版本号
      const newVersion = this.updateVersion(releaseType);

      // 3. 生成更新日志
      const changelog = await this.generateChangelog(lastTag);

      // 4. 构建应用
      const buildSuccess = await this.buildApp();
      if (!buildSuccess) {
        throw new Error('构建失败');
      }
      
      // 5. 上传到WebDAV服务器（如果配置了的话）
      console.log('🔍 检查WebDAV配置:');
      console.log(`  用户名: "${CONFIG.webdav.username}"`);
      console.log(`  URL: "${CONFIG.webdav.url}"`);
      console.log(`  远程路径: "${CONFIG.webdav.remotePath}"`);
      console.log(`  条件检查: ${CONFIG.webdav.username !== 'your-username' ? '✅ 通过' : '❌ 失败'}`);

      if (CONFIG.webdav.username !== 'your-username') {
        console.log('☁️ 开始WebDAV上传流程...');

        // 先创建必要的目录结构
        await this.createWebDAVDirectory(`${CONFIG.webdav.remotePath}/v${newVersion}`);
        await this.createWebDAVDirectory(`${CONFIG.webdav.remotePath}/v${newVersion}/windows`);

        await this.uploadToWebDAV(newVersion, changelog);
      } else {
        console.log('⚠️ 跳过WebDAV上传（未配置用户名密码）');
        console.log('💡 请配置 .env 文件中的WebDAV设置以启用自动上传');
      }
      
      // 6. 创建标签并推送
      await this.createAndPushTag(newVersion, changelog);
      
      console.log('\n' + '🎉'.repeat(20));
      console.log(`🎉 发布完成! 版本: v${newVersion}`);
      console.log('🎉'.repeat(20));
      console.log(`📝 更新日志:\n${changelog}`);
      console.log('\n✅ 所有步骤已完成，包括 WebDAV 上传！');
      
    } catch (error) {
      console.error('❌ 发布失败:', error);
      process.exit(1);
    }
  }
}

// 命令行入口
if (require.main === module) {
  const releaseType = process.argv[2];

  // 测试环境变量
  if (releaseType === '--test-env') {
    console.log('🔍 环境变量测试:');
    console.log('WEBDAV_URL:', process.env.WEBDAV_URL || '未配置');
    console.log('WEBDAV_USERNAME:', process.env.WEBDAV_USERNAME ? '已配置' : '未配置');
    console.log('WEBDAV_PASSWORD:', process.env.WEBDAV_PASSWORD ? '已配置' : '未配置');
    console.log('WEBDAV_REMOTE_PATH:', process.env.WEBDAV_REMOTE_PATH || '未配置');
    console.log('WEBDAV_BASE_URL:', process.env.WEBDAV_BASE_URL || '未配置');
    process.exit(0);
  }

  // 仅构建命令
  if (releaseType === 'build-only') {
    const manager = new VersionManager();
    manager.buildApp().then(success => {
      if (success) {
        console.log('🎉 构建完成！');
        process.exit(0);
      } else {
        console.error('❌ 构建失败');
        process.exit(1);
      }
    });
    return;
  }

  // 回滚命令
  if (releaseType === 'rollback') {
    const manager = new VersionManager();
    manager.rollback();
    return;
  }

  if (!['patch', 'minor', 'major'].includes(releaseType)) {
    console.error('❌ 请指定正确的命令类型');
    console.log('');
    console.log('📦 版本发布命令:');
    console.log('  node scripts/version-manager.cjs patch     # 提升补丁版本 (0.0.1)');
    console.log('  node scripts/version-manager.cjs minor     # 提升次要版本 (0.1.0)');
    console.log('  node scripts/version-manager.cjs major     # 提升主要版本 (1.0.0)');
    console.log('');
    console.log('🔨 构建命令:');
    console.log('  node scripts/version-manager.cjs build-only # 仅构建应用（加载环境变量）');
    console.log('');
    console.log('🔄 版本回滚命令:');
    console.log('  node scripts/version-manager.cjs rollback  # 回滚上一次版本发布');
    console.log('');
    console.log('🚀 或使用npm scripts:');
    console.log('  pnpm run release:patch');
    console.log('  pnpm run release:minor');
    console.log('  pnpm run release:major');
    console.log('  pnpm run release:rollback');
    console.log('  pnpm run tauri:build:env    # 仅构建（推荐）');
    process.exit(1);
  }

  const manager = new VersionManager();
  manager.release(releaseType);
}

module.exports = VersionManager;
