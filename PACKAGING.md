# GenresFox Extension Packaging Guide

This guide explains how to package the GenresFox extension into `.crx` format for distribution.

## Prerequisites

- Chrome or Edge browser installed
- The `src` folder containing all extension files

## Method 1: Using Chrome's Built-in Packager (Recommended)

This is the easiest and most reliable method:

1. **Open Chrome/Edge** and navigate to `chrome://extensions/`

2. **Enable Developer mode**
   - Toggle the "Developer mode" switch in the top right corner

3. **Click "Pack extension"**
   - This button appears when Developer mode is enabled

4. **Select extension root directory**
   - Click "Browse" and select the `src` folder from this project
   - Example: `G:\GenresFox-NEWTAB\src`

5. **Private key file (optional)**
   - **First-time packaging**: Leave this field blank
     - Chrome will generate a new private key file (`.pem`)
     - Save this `.pem` file securely for future updates
   - **Updating existing extension**: Select your existing `.pem` file
     - This ensures the extension ID remains the same

6. **Click "Pack Extension"**
   - Chrome will create two files:
     - `src.crx` - The packaged extension (this is what you need)
     - `src.pem` - The private key (keep this secure for updates)

7. **Rename the output file** (optional)
   - The default name is `src.crx`
   - You can rename it to `GenresFox-v0.4.5.crx` or similar

## Method 2: Using Command Line (Advanced)

### Windows (PowerShell)

```powershell
# Run the packaging script
.\package.ps1

# Or specify custom output name
.\package.ps1 -OutputName "GenresFox-v0.4.5.crx"
```

### Windows (Batch)

```cmd
package.bat
```

### macOS/Linux (Bash)

```bash
# Make script executable (first time only)
chmod +x package.sh

# Run the packaging script
./package.sh

# Or specify custom output name
./package.sh GenresFox-v0.4.5.crx
```

**Note**: The automated scripts primarily provide instructions and create backup ZIP files. For actual `.crx` creation, use Method 1 (Chrome's built-in packager).

## Method 3: Using Node.js Tools (Alternative)

If you have Node.js installed, you can use the `crx` package:

```bash
# Install crx globally
npm install -g crx

# Package the extension
crx pack src -o GenresFox-v0.4.5.crx
```

## File Structure

After packaging, you should have:

```
GenresFox-NEWTAB/
├── src/                    # Source files (do not distribute)
├── src.crx                 # Packaged extension (distribute this)
├── src.pem                 # Private key (keep secure, do not distribute)
└── ...
```

## Important Notes

### Private Key Security

- **Never share your `.pem` file publicly**
- Keep it secure and backed up
- You need the same `.pem` file to update the extension
- If you lose the `.pem` file, you'll need to create a new extension (new ID)

### Extension ID

- The extension ID is derived from the private key
- Using the same `.pem` file ensures the same extension ID
- Different `.pem` files = different extension IDs

### Distribution

- **Distribute**: `.crx` file
- **Do NOT distribute**: 
  - `src.pem` (private key)
  - `src/` folder (source code - unless open source)

## Installing Packaged Extension

### For Testing

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Drag and drop the `.crx` file into the extensions page
4. Or click "Load unpacked" and select the `src` folder (for development)

### For Distribution

- **Chrome Web Store**: Upload the `.crx` file through the developer dashboard
- **Direct Distribution**: Users can install by dragging the `.crx` file to `chrome://extensions/`
  - Note: Chrome may show a warning for extensions not from the Web Store

## Troubleshooting

### "Extension is invalid" Error

- Ensure all required files are in the `src` folder
- Check that `manifest.json` is valid JSON
- Verify all referenced files exist

### "Private key file is invalid"

- Use the same `.pem` file that was used for the original packaging
- Or leave blank to create a new extension

### Extension ID Changed

- This happens if you use a different `.pem` file
- Use the original `.pem` file to maintain the same ID

## Version Information

Current version: **0.4.5**

The version number is defined in:
- `src/manifest.json` - Extension version
- `src/config-manager.js` - Configuration version
- `src/newtab.html` - Displayed version

Make sure all version numbers match before packaging!

---

## 中文

# GenresFox 扩展打包指南

本指南说明如何将 GenresFox 扩展打包为 `.crx` 格式用于分发。

## 前置要求

- 已安装 Chrome 或 Edge 浏览器
- 包含所有扩展文件的 `src` 文件夹

## 方法 1：使用 Chrome 内置打包工具（推荐）

这是最简单可靠的方法：

1. **打开 Chrome/Edge** 并访问 `chrome://extensions/`

2. **启用开发者模式**
   - 在右上角切换"开发者模式"开关

3. **点击"打包扩展程序"**
   - 启用开发者模式后会出现此按钮

4. **选择扩展根目录**
   - 点击"浏览"，选择项目中的 `src` 文件夹
   - 示例：`G:\GenresFox-NEWTAB\src`

5. **私钥文件（可选）**
   - **首次打包**：将此字段留空
     - Chrome 会生成新的私钥文件（`.pem`）
     - 请安全保存此 `.pem` 文件以供将来更新使用
   - **更新现有扩展**：选择您现有的 `.pem` 文件
     - 这确保扩展 ID 保持不变

6. **点击"打包扩展程序"**
   - Chrome 将创建两个文件：
     - `src.crx` - 打包的扩展（这是您需要的）
     - `src.pem` - 私钥（请安全保存用于更新）

7. **重命名输出文件**（可选）
   - 默认名称是 `src.crx`
   - 您可以将其重命名为 `GenresFox-v0.4.5.crx` 或类似名称

## 方法 2：使用命令行（高级）

### Windows (PowerShell)

```powershell
# 运行打包脚本
.\package.ps1

# 或指定自定义输出名称
.\package.ps1 -OutputName "GenresFox-v0.4.5.crx"
```

### Windows (批处理)

```cmd
package.bat
```

### macOS/Linux (Bash)

```bash
# 添加执行权限（仅首次需要）
chmod +x package.sh

# 运行打包脚本
./package.sh

# 或指定自定义输出名称
./package.sh GenresFox-v0.4.5.crx
```

**注意**：自动化脚本主要提供说明并创建备份 ZIP 文件。要创建实际的 `.crx` 文件，请使用方法 1（Chrome 内置打包工具）。

## 方法 3：使用 Node.js 工具（替代方案）

如果您已安装 Node.js，可以使用 `crx` 包：

```bash
# 全局安装 crx
npm install -g crx

# 打包扩展
crx pack src -o GenresFox-v0.4.5.crx
```

## 文件结构

打包后，您应该有以下文件：

```
GenresFox-NEWTAB/
├── src/                    # 源文件（不要分发）
├── src.crx                 # 打包的扩展（分发此文件）
├── src.pem                 # 私钥（安全保存，不要分发）
└── ...
```

## 重要提示

### 私钥安全

- **永远不要公开分享您的 `.pem` 文件**
- 请安全保存并备份
- 更新扩展时需要相同的 `.pem` 文件
- 如果丢失 `.pem` 文件，您需要创建新扩展（新 ID）

### 扩展 ID

- 扩展 ID 由私钥派生
- 使用相同的 `.pem` 文件可确保相同的扩展 ID
- 不同的 `.pem` 文件 = 不同的扩展 ID

### 分发

- **分发**：`.crx` 文件
- **不要分发**：
  - `src.pem`（私钥）
  - `src/` 文件夹（源代码 - 除非是开源项目）

## 安装打包的扩展

### 用于测试

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 将 `.crx` 文件拖放到扩展页面
4. 或点击"加载已解压的扩展程序"并选择 `src` 文件夹（用于开发）

### 用于分发

- **Chrome 网上应用店**：通过开发者控制台上传 `.crx` 文件
- **直接分发**：用户可以通过将 `.crx` 文件拖到 `chrome://extensions/` 来安装
  - 注意：Chrome 可能会对非来自应用店的扩展显示警告

## 故障排除

### "扩展无效"错误

- 确保 `src` 文件夹中包含所有必需文件
- 检查 `manifest.json` 是否为有效的 JSON
- 验证所有引用的文件是否存在

### "私钥文件无效"

- 使用用于原始打包的相同 `.pem` 文件
- 或留空以创建新扩展

### 扩展 ID 已更改

- 如果使用不同的 `.pem` 文件会发生这种情况
- 使用原始 `.pem` 文件以保持相同的 ID

## 版本信息

当前版本：**0.4.5**

版本号定义在：
- `src/manifest.json` - 扩展版本
- `src/config-manager.js` - 配置版本
- `src/newtab.html` - 显示的版本

打包前请确保所有版本号匹配！

