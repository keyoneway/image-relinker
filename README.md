## 🛠 Featured Project
- **image‑relinker**｜Obsidian断图链接修复小工具，一键批量修复笔记中失效的图片引用
<div align="center">

**[English](#image-relinker)**&#8203;  **[中文说明](#中文说明)**&#8203;
</div>

<a id="image-relinker"></a>
# Image Relinker

Repair broken image embeds in the active Obsidian note by matching their file names against a selected attachment folder.

## Features

- Scans image embeds in the active Markdown note.
- Lets you select the attachment folder to search.
- Previews repairs before changing the note.
- Updates only unique file‑name matches; missing and ambiguous matches are left unchanged.

## Install

Until the plugin is listed in the Obsidian Community Plugins directory, copy `main.js`, `manifest.json`, and `styles.css` from a GitHub Release into the vault's `.obsidian/plugins/image-relinker/` folder, then enable **Image Relinker** in Obsidian.

## Use

1. Open the note containing broken image embeds.
2. Open the Command Palette with `Ctrl+P`.
3. Run **Image Relinker: 修复当前笔记图片**.
4. Select the folder containing the image files, scan, review the preview, and apply the safe repairs.

## Development

```bash
npm install
npm test
npm run check
npm run build
```

## 中文说明

### 适用场景

当 Markdown 笔记从桌面或其他位置复制到 Obsidian Vault 后，原图片链接可能会失效。例如，笔记中的图片原本位于桌面文件夹，后来图片被统一放入 Vault 的 `90‑Attachments` 文件夹。本插件会在你选定的附件目录中按文件名寻找图片，并将当前笔记中的失效图片链接替换为 Obsidian 可识别的嵌入链接。

### 使用方法

1. 将图片复制到 Vault 内的附件目录，例如 `90‑Attachments`。
2. 打开需要修复的 Markdown 笔记。
3. 按 `Ctrl+P` 打开命令面板，运行 **Image Relinker: 修复当前笔记图片**.
4. 在弹窗中选择保存图片的附件目录；默认会读取 Obsidian 的附件目录设置。
5. 点击 "扫描并预览"，检查 "可修复" 列表。
6. 确认无误后，点击 "应用修复".

### 安全规则

- 仅修改当前打开的笔记，不会移动、删除或重命名图片文件。
- 只有当所选目录内存在唯一同名图片时才会自动修复。
- 找不到文件或存在多个同名文件时，插件不会修改该链接。
- 扫描阶段不会改动笔记；只有点击 "应用修复" 后才会写入。

### 无法自动修复时

请确认图片已放入你选择的附件目录，且文件名与笔记中的链接文件名一致。若目录中有多个同名图片，请保留唯一的目标文件或手动修改链接后重新扫描。

## License

[MIT](LICENSE)
