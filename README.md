# Image Relinker

Repair broken image embeds in the active Obsidian note by matching their file names against a selected attachment folder.

## Features

- Scans image embeds in the active Markdown note.
- Lets you select the attachment folder to search.
- Previews repairs before changing the note.
- Updates only unique file-name matches; missing and ambiguous matches are left unchanged.

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

## License

[MIT](LICENSE)
