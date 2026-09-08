import {
  App,
  ButtonComponent,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
  TFolder,
  normalizePath,
} from "obsidian";
import {
  applyRepairPlan,
  buildRepairPlan,
  CandidateFile,
  RepairPlanItem,
  scanImageEmbeds,
} from "./link-repair";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"]);

function isImageFile(file: TFile): boolean {
  return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

function isInsideFolder(file: TFile, folderPath: string): boolean {
  if (!folderPath) return true;
  return file.path.startsWith(`${folderPath}/`);
}

function statusLabel(item: RepairPlanItem): string {
  switch (item.status) {
    case "resolved": return "已正常";
    case "repairable": return "可修复";
    case "missing": return "未找到";
    case "ambiguous": return "重名冲突";
  }
}

export default class ImageRelinkerPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "repair-active-note",
      name: "修复当前笔记图片",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const canRepair = file instanceof TFile && file.extension === "md";
        if (canRepair && !checking) this.openRepairModal(file);
        return canRepair;
      },
    });

    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFile) || file.extension !== "md") return;
      menu.addItem((item) => item
        .setTitle("图片重链器：修复图片链接")
        .setIcon("image")
        .onClick(() => this.openRepairModal(file)));
    }));
  }

  openRepairModal(file: TFile): void {
    new ImageRepairModal(this.app, this, file).open();
  }

  defaultAttachmentFolder(): string {
    const configured = (this.app.vault as unknown as {
      getConfig: (key: string) => unknown;
    }).getConfig("attachmentFolderPath");
    return typeof configured === "string" ? normalizePath(configured) : "";
  }

  vaultFolders(): string[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .map((folder) => folder.path)
      .filter((path) => path.length > 0)
      .sort((left, right) => left.localeCompare(right));
  }

  imageCandidates(folderPath: string): CandidateFile[] {
    return this.app.vault.getFiles()
      .filter((file) => isImageFile(file) && isInsideFolder(file, folderPath))
      .map((file) => ({ path: file.path, name: file.name }));
  }
}

class ImageRepairModal extends Modal {
  private folderPath: string;
  private plan: RepairPlanItem[] = [];
  private scannedContent = "";
  private resultEl!: HTMLElement;
  private applyButton!: ButtonComponent;

  constructor(
    app: App,
    private readonly plugin: ImageRelinkerPlugin,
    private readonly sourceFile: TFile,
  ) {
    super(app);
    this.folderPath = plugin.defaultAttachmentFolder();
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "修复当前笔记图片链接" });
    contentEl.createEl("p", {
      text: "仅按文件名唯一匹配；扫描阶段不会修改笔记或附件。",
    });

    new Setting(contentEl)
      .setName("附件目录")
      .setDesc("默认读取 Obsidian 的附件目录设置，可改选任意库内目录。")
      .addDropdown((dropdown) => {
        const folders = this.plugin.vaultFolders();
        if (this.folderPath && !folders.includes(this.folderPath)) folders.unshift(this.folderPath);
        folders.forEach((path) => dropdown.addOption(path, path));
        dropdown.setValue(this.folderPath).onChange((value) => {
          this.folderPath = normalizePath(value);
          this.clearPreview();
        });
      });

    new Setting(contentEl)
      .addButton((button) => button
        .setButtonText("扫描并预览")
        .setCta()
        .onClick(async () => this.scanAndRender()))
      .addButton((button) => {
        this.applyButton = button
          .setButtonText("应用修复")
          .setDisabled(true)
          .onClick(async () => this.applyRepairs());
      });

    this.resultEl = contentEl.createDiv({ cls: "image-relinker-results" });
  }

  private clearPreview(): void {
    this.plan = [];
    this.scannedContent = "";
    this.applyButton?.setDisabled(true);
    this.resultEl?.empty();
  }

  private async scanAndRender(): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(this.folderPath);
    if (!(folder instanceof TFolder)) {
      new Notice(`未找到附件目录：${this.folderPath || "（未设置）"}`);
      return;
    }

    this.scannedContent = await this.app.vault.read(this.sourceFile);
    const embeds = scanImageEmbeds(this.scannedContent);
    const candidates = this.plugin.imageCandidates(this.folderPath);
    this.plan = buildRepairPlan(embeds, candidates, (embed) => {
      const target = this.app.metadataCache.getFirstLinkpathDest(embed.linkpath, this.sourceFile.path);
      return target instanceof TFile;
    });
    this.renderPreview();
  }

  private renderPreview(): void {
    this.resultEl.empty();
    const counts = this.plan.reduce<Record<string, number>>((result, item) => {
      result[item.status] = (result[item.status] ?? 0) + 1;
      return result;
    }, {});
    const repairable = counts.repairable ?? 0;
    this.applyButton.setButtonText(`应用修复 (${repairable})`).setDisabled(repairable === 0);
    this.resultEl.createDiv({
      cls: "image-relinker-summary",
      text: `扫描 ${this.plan.length}｜已正常 ${counts.resolved ?? 0}｜可修复 ${repairable}｜未找到 ${counts.missing ?? 0}｜冲突 ${counts.ambiguous ?? 0}`,
    });

    this.plan.forEach((item) => {
      const row = this.resultEl.createDiv({ cls: "image-relinker-row" });
      row.createSpan({ cls: "image-relinker-status", text: statusLabel(item) });
      row.createSpan({ text: item.filename });
      row.createDiv({ cls: "image-relinker-path", text: item.raw });
      if (item.target) row.createDiv({ cls: "image-relinker-path", text: `→ ${item.target.path}` });
    });
  }

  private async applyRepairs(): Promise<void> {
    const currentContent = await this.app.vault.read(this.sourceFile);
    if (currentContent !== this.scannedContent) {
      new Notice("笔记在预览后已发生变化；请重新扫描再应用修复。");
      await this.scanAndRender();
      return;
    }

    const validPlan = this.plan.filter((item) => {
      if (item.status !== "repairable" || !item.target) return false;
      return this.app.vault.getAbstractFileByPath(item.target.path) instanceof TFile;
    });
    if (validPlan.length === 0) {
      new Notice("没有可安全应用的修复项。请重新扫描。");
      return;
    }

    const updated = applyRepairPlan(currentContent, validPlan, (target) => {
      const targetFile = this.app.vault.getAbstractFileByPath(target.path);
      if (!(targetFile instanceof TFile)) return "";
      return `!${this.app.fileManager.generateMarkdownLink(targetFile, this.sourceFile.path)}`;
    });
    await this.app.vault.modify(this.sourceFile, updated);
    new Notice(`图片重链器：已修复 ${validPlan.length} 个图片链接。`);
    await this.scanAndRender();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
