# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for automated testing, building, and releasing the GenresFox extension.

## Workflows

### 1. CI (`ci.yml`)

**Triggers:**
- Push to `main` or `dev` branches
- Pull requests to `main` or `dev` branches

**Jobs:**
- **Validate**: Validates `manifest.json`, checks file integrity, and verifies localization files
- **Package**: Creates a ZIP package of the extension with version number

**Artifacts:**
- Extension ZIP package (retained for 7 days)
- SHA256 checksum file

### 2. Release (`release.yml`)

**Triggers:**
- Push of a tag matching `v*` pattern (e.g., `v0.4.6`)

**Jobs:**
- Verifies tag version matches `manifest.json` version
- Packages the extension
- Generates release notes from `CHANGELOG.md`
- Creates a GitHub Release with:
  - Extension ZIP package
  - SHA256 checksum
  - SHA512 checksum

**Usage:**
```bash
# Create and push a version tag
git tag v0.4.6
git push origin v0.4.6
```

### 3. Code Quality (`code-quality.yml`)

**Triggers:**
- Push to `main` or `dev` branches
- Pull requests to `main` or `dev` branches
- Manual trigger via workflow_dispatch

**Checks:**
- JSON syntax validation
- JavaScript syntax validation
- HTML syntax validation (if tidy is available)
- Security issue detection (eval, innerHTML, dangerous URLs)
- File size checks
- Manifest permission verification

### 4. WASM Build (`wasm-build.yml`)

**Triggers:**
- Push to `main` or `dev` branches with changes to `src/wasm-resize/**`
- Pull requests with changes to `src/wasm-resize/**`
- Manual trigger via workflow_dispatch

**Jobs:**
- Builds the WebAssembly module using Rust
- Verifies the WASM file
- Compares with existing WASM file
- Uploads artifact (on push) or comments on PR (on pull request)

**Note:** After WASM changes are merged, manually copy the built file:
```bash
cp src/wasm-resize/target/wasm32-unknown-unknown/release/wasm_resize.wasm src/resize.wasm
```

## Workflow Status Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/username/GenresFox/workflows/CI/badge.svg)
![Code Quality](https://github.com/username/GenresFox/workflows/Code%20Quality/badge.svg)
![WASM Build](https://github.com/username/GenresFox/workflows/WASM%20Build/badge.svg)
```

## Release Process

1. **Update version** in `src/manifest.json`
2. **Update CHANGELOG.md** with new version entry
3. **Commit and push** changes:
   ```bash
   git add src/manifest.json CHANGELOG.md
   git commit -m "chore: bump version to 0.4.7"
   git push origin dev
   ```
4. **Merge to main** (if using dev branch):
   ```bash
   git checkout main
   git merge dev --no-ff
   git push origin main
   ```
5. **Create and push tag**:
   ```bash
   git tag v0.4.7
   git push origin v0.4.7
   ```
6. **GitHub Actions** will automatically:
   - Validate the extension
   - Package it
   - Create a GitHub Release
   - Upload artifacts with checksums

## Manual Workflow Triggers

Some workflows support manual triggering:

1. Go to **Actions** tab in GitHub
2. Select the workflow (e.g., "Code Quality")
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Troubleshooting

### Workflow Fails on Validation

- Check that `manifest.json` is valid JSON
- Verify version format matches `X.Y.Z` or `X.Y.Z.W`
- Ensure all required files exist in `src/`

### Release Workflow Fails

- Ensure tag version matches `manifest.json` version exactly
- Check that `CHANGELOG.md` has an entry for the version
- Verify you have write permissions to the repository

### WASM Build Fails

- Check Rust toolchain is properly installed
- Verify `Cargo.toml` is valid
- Check for compilation errors in Rust code

## Permissions

The workflows use the default `GITHUB_TOKEN` which has:
- Read access to repository contents
- Write access for releases (for release workflow)

No additional secrets are required for basic CI/CD functionality.

## Customization

### Modify Package Exclusions

Edit the `zip` command in `ci.yml` and `release.yml` to exclude additional files:

```yaml
zip -r "../GenresFox-v${{ steps.version.outputs.version }}.zip" . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.test.js"  # Add your exclusions here
```

### Add Additional Checks

Edit `code-quality.yml` to add custom validation steps:

```yaml
- name: Custom Check
  run: |
    # Your custom validation logic
```

## Best Practices

1. **Always test locally** before pushing
2. **Keep version numbers consistent** across all files
3. **Update CHANGELOG.md** before creating releases
4. **Use semantic versioning** (MAJOR.MINOR.PATCH)
5. **Review workflow logs** if builds fail
6. **Keep workflows simple** and focused on one task

---

## 中文

# GitHub Actions CI/CD

此目录包含用于自动测试、构建和发布 GenresFox 扩展的 GitHub Actions 工作流。

## 工作流

### 1. CI (`ci.yml`)

**触发条件:**
- 推送到 `main` 或 `dev` 分支
- 向 `main` 或 `dev` 分支的拉取请求

**任务:**
- **验证**: 验证 `manifest.json`、检查文件完整性、验证本地化文件
- **打包**: 创建带版本号的扩展 ZIP 包

**产物:**
- 扩展 ZIP 包（保留 7 天）
- SHA256 校验和文件

### 2. Release (`release.yml`)

**触发条件:**
- 推送匹配 `v*` 模式的标签（例如 `v0.4.6`）

**任务:**
- 验证标签版本是否与 `manifest.json` 版本匹配
- 打包扩展
- 从 `CHANGELOG.md` 生成发布说明
- 创建 GitHub Release，包含：
  - 扩展 ZIP 包
  - SHA256 校验和
  - SHA512 校验和

**使用方法:**
```bash
# 创建并推送版本标签
git tag v0.4.6
git push origin v0.4.6
```

### 3. Code Quality (`code-quality.yml`)

**触发条件:**
- 推送到 `main` 或 `dev` 分支
- 向 `main` 或 `dev` 分支的拉取请求
- 通过 workflow_dispatch 手动触发

**检查项:**
- JSON 语法验证
- JavaScript 语法验证
- HTML 语法验证（如果可用 tidy）
- 安全问题检测（eval、innerHTML、危险 URL）
- 文件大小检查
- Manifest 权限验证

### 4. WASM Build (`wasm-build.yml`)

**触发条件:**
- 推送到 `main` 或 `dev` 分支且 `src/wasm-resize/**` 有更改
- 拉取请求中 `src/wasm-resize/**` 有更改
- 通过 workflow_dispatch 手动触发

**任务:**
- 使用 Rust 构建 WebAssembly 模块
- 验证 WASM 文件
- 与现有 WASM 文件比较
- 上传产物（推送时）或在 PR 上评论（拉取请求时）

**注意:** WASM 更改合并后，手动复制构建的文件：
```bash
cp src/wasm-resize/target/wasm32-unknown-unknown/release/wasm_resize.wasm src/resize.wasm
```

## 发布流程

1. **更新版本** 在 `src/manifest.json` 中
2. **更新 CHANGELOG.md** 添加新版本条目
3. **提交并推送** 更改：
   ```bash
   git add src/manifest.json CHANGELOG.md
   git commit -m "chore: bump version to 0.4.7"
   git push origin dev
   ```
4. **合并到 main**（如果使用 dev 分支）：
   ```bash
   git checkout main
   git merge dev --no-ff
   git push origin main
   ```
5. **创建并推送标签**：
   ```bash
   git tag v0.4.7
   git push origin v0.4.7
   ```
6. **GitHub Actions** 将自动：
   - 验证扩展
   - 打包
   - 创建 GitHub Release
   - 上传带校验和的产物

## 故障排除

### 工作流在验证时失败

- 检查 `manifest.json` 是否为有效 JSON
- 验证版本格式是否匹配 `X.Y.Z` 或 `X.Y.Z.W`
- 确保 `src/` 中存在所有必需文件

### Release 工作流失败

- 确保标签版本与 `manifest.json` 版本完全匹配
- 检查 `CHANGELOG.md` 是否有该版本的条目
- 验证您对仓库有写入权限

### WASM 构建失败

- 检查 Rust 工具链是否正确安装
- 验证 `Cargo.toml` 是否有效
- 检查 Rust 代码中的编译错误
