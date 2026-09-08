"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ImageRelinkerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/link-repair.ts
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif"
]);
var IMAGE_EMBED = /!\[[^\]]*\]\((?<markdown>[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)|!\[\[(?<wiki>[^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}
function filenameFromPath(linkpath) {
  const decoded = decodePath(linkpath).replace(/\\/g, "/");
  return decoded.slice(decoded.lastIndexOf("/") + 1);
}
function isImageFilename(filename) {
  const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}
function scanImageEmbeds(markdown) {
  var _a, _b, _c, _d;
  const embeds = [];
  for (const match of markdown.matchAll(IMAGE_EMBED)) {
    const linkpath = (_c = (_a = match.groups) == null ? void 0 : _a.markdown) != null ? _c : (_b = match.groups) == null ? void 0 : _b.wiki;
    if (!linkpath || match.index === void 0) {
      continue;
    }
    const filename = filenameFromPath(linkpath);
    if (!isImageFilename(filename)) {
      continue;
    }
    embeds.push({
      raw: match[0],
      linkpath,
      filename,
      start: match.index,
      end: match.index + match[0].length,
      style: ((_d = match.groups) == null ? void 0 : _d.markdown) ? "markdown" : "wiki"
    });
  }
  return embeds;
}
function buildRepairPlan(embeds, candidates, isResolved) {
  return embeds.map((embed) => {
    if (isResolved(embed)) {
      return { ...embed, status: "resolved" };
    }
    const matches = candidates.filter(
      (candidate) => candidate.name.toLocaleLowerCase() === embed.filename.toLocaleLowerCase()
    );
    if (matches.length === 1) {
      return { ...embed, status: "repairable", target: matches[0] };
    }
    return { ...embed, status: matches.length === 0 ? "missing" : "ambiguous" };
  });
}
function applyRepairPlan(markdown, plan, createEmbed) {
  const repairs = plan.filter((item) => item.status === "repairable" && !!item.target).sort((left, right) => right.start - left.start);
  return repairs.reduce(
    (updated, item) => `${updated.slice(0, item.start)}${createEmbed(item.target, item)}${updated.slice(item.end)}`,
    markdown
  );
}

// src/main.ts
var IMAGE_EXTENSIONS2 = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"]);
function isImageFile(file) {
  return IMAGE_EXTENSIONS2.has(file.extension.toLowerCase());
}
function isInsideFolder(file, folderPath) {
  if (!folderPath) return true;
  return file.path.startsWith(`${folderPath}/`);
}
function statusLabel(item) {
  switch (item.status) {
    case "resolved":
      return "\u5DF2\u6B63\u5E38";
    case "repairable":
      return "\u53EF\u4FEE\u590D";
    case "missing":
      return "\u672A\u627E\u5230";
    case "ambiguous":
      return "\u91CD\u540D\u51B2\u7A81";
  }
}
var ImageRelinkerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: "repair-active-note",
      name: "\u4FEE\u590D\u5F53\u524D\u7B14\u8BB0\u56FE\u7247",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const canRepair = file instanceof import_obsidian.TFile && file.extension === "md";
        if (canRepair && !checking) this.openRepairModal(file);
        return canRepair;
      }
    });
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof import_obsidian.TFile) || file.extension !== "md") return;
      menu.addItem((item) => item.setTitle("\u56FE\u7247\u91CD\u94FE\u5668\uFF1A\u4FEE\u590D\u56FE\u7247\u94FE\u63A5").setIcon("image").onClick(() => this.openRepairModal(file)));
    }));
  }
  openRepairModal(file) {
    new ImageRepairModal(this.app, this, file).open();
  }
  defaultAttachmentFolder() {
    const configured = this.app.vault.getConfig("attachmentFolderPath");
    return typeof configured === "string" ? (0, import_obsidian.normalizePath)(configured) : "";
  }
  vaultFolders() {
    return this.app.vault.getAllLoadedFiles().filter((file) => file instanceof import_obsidian.TFolder).map((folder) => folder.path).filter((path) => path.length > 0).sort((left, right) => left.localeCompare(right));
  }
  imageCandidates(folderPath) {
    return this.app.vault.getFiles().filter((file) => isImageFile(file) && isInsideFolder(file, folderPath)).map((file) => ({ path: file.path, name: file.name }));
  }
};
var ImageRepairModal = class extends import_obsidian.Modal {
  constructor(app, plugin, sourceFile) {
    super(app);
    this.plugin = plugin;
    this.sourceFile = sourceFile;
    __publicField(this, "folderPath");
    __publicField(this, "plan", []);
    __publicField(this, "scannedContent", "");
    __publicField(this, "resultEl");
    __publicField(this, "applyButton");
    this.folderPath = plugin.defaultAttachmentFolder();
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "\u4FEE\u590D\u5F53\u524D\u7B14\u8BB0\u56FE\u7247\u94FE\u63A5" });
    contentEl.createEl("p", {
      text: "\u4EC5\u6309\u6587\u4EF6\u540D\u552F\u4E00\u5339\u914D\uFF1B\u626B\u63CF\u9636\u6BB5\u4E0D\u4F1A\u4FEE\u6539\u7B14\u8BB0\u6216\u9644\u4EF6\u3002"
    });
    new import_obsidian.Setting(contentEl).setName("\u9644\u4EF6\u76EE\u5F55").setDesc("\u9ED8\u8BA4\u8BFB\u53D6 Obsidian \u7684\u9644\u4EF6\u76EE\u5F55\u8BBE\u7F6E\uFF0C\u53EF\u6539\u9009\u4EFB\u610F\u5E93\u5185\u76EE\u5F55\u3002").addDropdown((dropdown) => {
      const folders = this.plugin.vaultFolders();
      if (this.folderPath && !folders.includes(this.folderPath)) folders.unshift(this.folderPath);
      folders.forEach((path) => {
        dropdown.addOption(path, path);
      });
      dropdown.setValue(this.folderPath).onChange((value) => {
        this.folderPath = (0, import_obsidian.normalizePath)(value);
        this.clearPreview();
      });
    });
    new import_obsidian.Setting(contentEl).addButton((button) => button.setButtonText("\u626B\u63CF\u5E76\u9884\u89C8").setCta().onClick(async () => this.scanAndRender())).addButton((button) => {
      this.applyButton = button.setButtonText("\u5E94\u7528\u4FEE\u590D").setDisabled(true).onClick(async () => this.applyRepairs());
    });
    this.resultEl = contentEl.createDiv({ cls: "image-relinker-results" });
  }
  clearPreview() {
    var _a, _b;
    this.plan = [];
    this.scannedContent = "";
    (_a = this.applyButton) == null ? void 0 : _a.setDisabled(true);
    (_b = this.resultEl) == null ? void 0 : _b.empty();
  }
  async scanAndRender() {
    const folder = this.app.vault.getAbstractFileByPath(this.folderPath);
    if (!(folder instanceof import_obsidian.TFolder)) {
      new import_obsidian.Notice(`\u672A\u627E\u5230\u9644\u4EF6\u76EE\u5F55\uFF1A${this.folderPath || "\uFF08\u672A\u8BBE\u7F6E\uFF09"}`);
      return;
    }
    this.scannedContent = await this.app.vault.read(this.sourceFile);
    const embeds = scanImageEmbeds(this.scannedContent);
    const candidates = this.plugin.imageCandidates(this.folderPath);
    this.plan = buildRepairPlan(embeds, candidates, (embed) => {
      const target = this.app.metadataCache.getFirstLinkpathDest(embed.linkpath, this.sourceFile.path);
      return target instanceof import_obsidian.TFile;
    });
    this.renderPreview();
  }
  renderPreview() {
    var _a, _b, _c, _d;
    this.resultEl.empty();
    const counts = this.plan.reduce((result, item) => {
      var _a2;
      result[item.status] = ((_a2 = result[item.status]) != null ? _a2 : 0) + 1;
      return result;
    }, {});
    const repairable = (_a = counts.repairable) != null ? _a : 0;
    this.applyButton.setButtonText(`\u5E94\u7528\u4FEE\u590D (${repairable})`).setDisabled(repairable === 0);
    this.resultEl.createDiv({
      cls: "image-relinker-summary",
      text: `\u626B\u63CF ${this.plan.length}\uFF5C\u5DF2\u6B63\u5E38 ${(_b = counts.resolved) != null ? _b : 0}\uFF5C\u53EF\u4FEE\u590D ${repairable}\uFF5C\u672A\u627E\u5230 ${(_c = counts.missing) != null ? _c : 0}\uFF5C\u51B2\u7A81 ${(_d = counts.ambiguous) != null ? _d : 0}`
    });
    this.plan.forEach((item) => {
      const row = this.resultEl.createDiv({ cls: "image-relinker-row" });
      row.createSpan({ cls: "image-relinker-status", text: statusLabel(item) });
      row.createSpan({ text: item.filename });
      row.createDiv({ cls: "image-relinker-path", text: item.raw });
      if (item.target) row.createDiv({ cls: "image-relinker-path", text: `\u2192 ${item.target.path}` });
    });
  }
  async applyRepairs() {
    const currentContent = await this.app.vault.read(this.sourceFile);
    if (currentContent !== this.scannedContent) {
      new import_obsidian.Notice("\u7B14\u8BB0\u5728\u9884\u89C8\u540E\u5DF2\u53D1\u751F\u53D8\u5316\uFF1B\u8BF7\u91CD\u65B0\u626B\u63CF\u518D\u5E94\u7528\u4FEE\u590D\u3002");
      await this.scanAndRender();
      return;
    }
    const validPlan = this.plan.filter((item) => {
      if (item.status !== "repairable" || !item.target) return false;
      return this.app.vault.getAbstractFileByPath(item.target.path) instanceof import_obsidian.TFile;
    });
    if (validPlan.length === 0) {
      new import_obsidian.Notice("\u6CA1\u6709\u53EF\u5B89\u5168\u5E94\u7528\u7684\u4FEE\u590D\u9879\u3002\u8BF7\u91CD\u65B0\u626B\u63CF\u3002");
      return;
    }
    const updated = applyRepairPlan(currentContent, validPlan, (target) => {
      const targetFile = this.app.vault.getAbstractFileByPath(target.path);
      if (!(targetFile instanceof import_obsidian.TFile)) return "";
      return `!${this.app.fileManager.generateMarkdownLink(targetFile, this.sourceFile.path)}`;
    });
    await this.app.vault.modify(this.sourceFile, updated);
    new import_obsidian.Notice(`\u56FE\u7247\u91CD\u94FE\u5668\uFF1A\u5DF2\u4FEE\u590D ${validPlan.length} \u4E2A\u56FE\u7247\u94FE\u63A5\u3002`);
    await this.scanAndRender();
  }
  onClose() {
    this.contentEl.empty();
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xpbmstcmVwYWlyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIEJ1dHRvbkNvbXBvbmVudCxcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGx1Z2luLFxuICBTZXR0aW5nLFxuICBURmlsZSxcbiAgVEZvbGRlcixcbiAgbm9ybWFsaXplUGF0aCxcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBhcHBseVJlcGFpclBsYW4sXG4gIGJ1aWxkUmVwYWlyUGxhbixcbiAgQ2FuZGlkYXRlRmlsZSxcbiAgUmVwYWlyUGxhbkl0ZW0sXG4gIHNjYW5JbWFnZUVtYmVkcyxcbn0gZnJvbSBcIi4vbGluay1yZXBhaXJcIjtcblxuY29uc3QgSU1BR0VfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1wicG5nXCIsIFwianBnXCIsIFwianBlZ1wiLCBcImdpZlwiLCBcIndlYnBcIiwgXCJibXBcIiwgXCJzdmdcIiwgXCJhdmlmXCJdKTtcblxuZnVuY3Rpb24gaXNJbWFnZUZpbGUoZmlsZTogVEZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIElNQUdFX0VYVEVOU0lPTlMuaGFzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpO1xufVxuXG5mdW5jdGlvbiBpc0luc2lkZUZvbGRlcihmaWxlOiBURmlsZSwgZm9sZGVyUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICghZm9sZGVyUGF0aCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtmb2xkZXJQYXRofS9gKTtcbn1cblxuZnVuY3Rpb24gc3RhdHVzTGFiZWwoaXRlbTogUmVwYWlyUGxhbkl0ZW0pOiBzdHJpbmcge1xuICBzd2l0Y2ggKGl0ZW0uc3RhdHVzKSB7XG4gICAgY2FzZSBcInJlc29sdmVkXCI6IHJldHVybiBcIlx1NURGMlx1NkI2M1x1NUUzOFwiO1xuICAgIGNhc2UgXCJyZXBhaXJhYmxlXCI6IHJldHVybiBcIlx1NTNFRlx1NEZFRVx1NTkwRFwiO1xuICAgIGNhc2UgXCJtaXNzaW5nXCI6IHJldHVybiBcIlx1NjcyQVx1NjI3RVx1NTIzMFwiO1xuICAgIGNhc2UgXCJhbWJpZ3VvdXNcIjogcmV0dXJuIFwiXHU5MUNEXHU1NDBEXHU1MUIyXHU3QTgxXCI7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1hZ2VSZWxpbmtlclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwicmVwYWlyLWFjdGl2ZS1ub3RlXCIsXG4gICAgICBuYW1lOiBcIlx1NEZFRVx1NTkwRFx1NUY1M1x1NTI0RFx1N0IxNFx1OEJCMFx1NTZGRVx1NzI0N1wiLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgICBjb25zdCBjYW5SZXBhaXIgPSBmaWxlIGluc3RhbmNlb2YgVEZpbGUgJiYgZmlsZS5leHRlbnNpb24gPT09IFwibWRcIjtcbiAgICAgICAgaWYgKGNhblJlcGFpciAmJiAhY2hlY2tpbmcpIHRoaXMub3BlblJlcGFpck1vZGFsKGZpbGUpO1xuICAgICAgICByZXR1cm4gY2FuUmVwYWlyO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlLW1lbnVcIiwgKG1lbnUsIGZpbGUpID0+IHtcbiAgICAgIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkgfHwgZmlsZS5leHRlbnNpb24gIT09IFwibWRcIikgcmV0dXJuO1xuICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiBpdGVtXG4gICAgICAgIC5zZXRUaXRsZShcIlx1NTZGRVx1NzI0N1x1OTFDRFx1OTRGRVx1NTY2OFx1RkYxQVx1NEZFRVx1NTkwRFx1NTZGRVx1NzI0N1x1OTRGRVx1NjNBNVwiKVxuICAgICAgICAuc2V0SWNvbihcImltYWdlXCIpXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMub3BlblJlcGFpck1vZGFsKGZpbGUpKSk7XG4gICAgfSkpO1xuICB9XG5cbiAgb3BlblJlcGFpck1vZGFsKGZpbGU6IFRGaWxlKTogdm9pZCB7XG4gICAgbmV3IEltYWdlUmVwYWlyTW9kYWwodGhpcy5hcHAsIHRoaXMsIGZpbGUpLm9wZW4oKTtcbiAgfVxuXG4gIGRlZmF1bHRBdHRhY2htZW50Rm9sZGVyKCk6IHN0cmluZyB7XG4gICAgY29uc3QgY29uZmlndXJlZCA9ICh0aGlzLmFwcC52YXVsdCBhcyB1bmtub3duIGFzIHtcbiAgICAgIGdldENvbmZpZzogKGtleTogc3RyaW5nKSA9PiB1bmtub3duO1xuICAgIH0pLmdldENvbmZpZyhcImF0dGFjaG1lbnRGb2xkZXJQYXRoXCIpO1xuICAgIHJldHVybiB0eXBlb2YgY29uZmlndXJlZCA9PT0gXCJzdHJpbmdcIiA/IG5vcm1hbGl6ZVBhdGgoY29uZmlndXJlZCkgOiBcIlwiO1xuICB9XG5cbiAgdmF1bHRGb2xkZXJzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKVxuICAgICAgLmZpbHRlcigoZmlsZSk6IGZpbGUgaXMgVEZvbGRlciA9PiBmaWxlIGluc3RhbmNlb2YgVEZvbGRlcilcbiAgICAgIC5tYXAoKGZvbGRlcikgPT4gZm9sZGVyLnBhdGgpXG4gICAgICAuZmlsdGVyKChwYXRoKSA9PiBwYXRoLmxlbmd0aCA+IDApXG4gICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpO1xuICB9XG5cbiAgaW1hZ2VDYW5kaWRhdGVzKGZvbGRlclBhdGg6IHN0cmluZyk6IENhbmRpZGF0ZUZpbGVbXSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGlzSW1hZ2VGaWxlKGZpbGUpICYmIGlzSW5zaWRlRm9sZGVyKGZpbGUsIGZvbGRlclBhdGgpKVxuICAgICAgLm1hcCgoZmlsZSkgPT4gKHsgcGF0aDogZmlsZS5wYXRoLCBuYW1lOiBmaWxlLm5hbWUgfSkpO1xuICB9XG59XG5cbmNsYXNzIEltYWdlUmVwYWlyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgZm9sZGVyUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIHBsYW46IFJlcGFpclBsYW5JdGVtW10gPSBbXTtcbiAgcHJpdmF0ZSBzY2FubmVkQ29udGVudCA9IFwiXCI7XG4gIHByaXZhdGUgcmVzdWx0RWwhOiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSBhcHBseUJ1dHRvbiE6IEJ1dHRvbkNvbXBvbmVudDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogSW1hZ2VSZWxpbmtlclBsdWdpbixcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZUZpbGU6IFRGaWxlLFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuZm9sZGVyUGF0aCA9IHBsdWdpbi5kZWZhdWx0QXR0YWNobWVudEZvbGRlcigpO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJcdTRGRUVcdTU5MERcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcdTU2RkVcdTcyNDdcdTk0RkVcdTYzQTVcIiB9KTtcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiXHU0RUM1XHU2MzA5XHU2NTg3XHU0RUY2XHU1NDBEXHU1NTJGXHU0RTAwXHU1MzM5XHU5MTREXHVGRjFCXHU2MjZCXHU2M0NGXHU5NjM2XHU2QkI1XHU0RTBEXHU0RjFBXHU0RkVFXHU2NTM5XHU3QjE0XHU4QkIwXHU2MjE2XHU5NjQ0XHU0RUY2XHUzMDAyXCIsXG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlx1OTY0NFx1NEVGNlx1NzZFRVx1NUY1NVwiKVxuICAgICAgLnNldERlc2MoXCJcdTlFRDhcdThCQTRcdThCRkJcdTUzRDYgT2JzaWRpYW4gXHU3Njg0XHU5NjQ0XHU0RUY2XHU3NkVFXHU1RjU1XHU4QkJFXHU3RjZFXHVGRjBDXHU1M0VGXHU2NTM5XHU5MDA5XHU0RUZCXHU2MTBGXHU1RTkzXHU1MTg1XHU3NkVFXHU1RjU1XHUzMDAyXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLnBsdWdpbi52YXVsdEZvbGRlcnMoKTtcbiAgICAgICAgaWYgKHRoaXMuZm9sZGVyUGF0aCAmJiAhZm9sZGVycy5pbmNsdWRlcyh0aGlzLmZvbGRlclBhdGgpKSBmb2xkZXJzLnVuc2hpZnQodGhpcy5mb2xkZXJQYXRoKTtcbiAgICAgICAgZm9sZGVycy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKHBhdGgsIHBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5mb2xkZXJQYXRoKS5vbkNoYW5nZSgodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLmZvbGRlclBhdGggPSBub3JtYWxpemVQYXRoKHZhbHVlKTtcbiAgICAgICAgICB0aGlzLmNsZWFyUHJldmlldygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiBidXR0b25cbiAgICAgICAgLnNldEJ1dHRvblRleHQoXCJcdTYyNkJcdTYzQ0ZcdTVFNzZcdTk4ODRcdTg5QzhcIilcbiAgICAgICAgLnNldEN0YSgpXG4gICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHRoaXMuc2NhbkFuZFJlbmRlcigpKSlcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICB0aGlzLmFwcGx5QnV0dG9uID0gYnV0dG9uXG4gICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJcdTVFOTRcdTc1MjhcdTRGRUVcdTU5MERcIilcbiAgICAgICAgICAuc2V0RGlzYWJsZWQodHJ1ZSlcbiAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB0aGlzLmFwcGx5UmVwYWlycygpKTtcbiAgICAgIH0pO1xuXG4gICAgdGhpcy5yZXN1bHRFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiaW1hZ2UtcmVsaW5rZXItcmVzdWx0c1wiIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjbGVhclByZXZpZXcoKTogdm9pZCB7XG4gICAgdGhpcy5wbGFuID0gW107XG4gICAgdGhpcy5zY2FubmVkQ29udGVudCA9IFwiXCI7XG4gICAgdGhpcy5hcHBseUJ1dHRvbj8uc2V0RGlzYWJsZWQodHJ1ZSk7XG4gICAgdGhpcy5yZXN1bHRFbD8uZW1wdHkoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2NhbkFuZFJlbmRlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5mb2xkZXJQYXRoKTtcbiAgICBpZiAoIShmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSkge1xuICAgICAgbmV3IE5vdGljZShgXHU2NzJBXHU2MjdFXHU1MjMwXHU5NjQ0XHU0RUY2XHU3NkVFXHU1RjU1XHVGRjFBJHt0aGlzLmZvbGRlclBhdGggfHwgXCJcdUZGMDhcdTY3MkFcdThCQkVcdTdGNkVcdUZGMDlcIn1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNjYW5uZWRDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZCh0aGlzLnNvdXJjZUZpbGUpO1xuICAgIGNvbnN0IGVtYmVkcyA9IHNjYW5JbWFnZUVtYmVkcyh0aGlzLnNjYW5uZWRDb250ZW50KTtcbiAgICBjb25zdCBjYW5kaWRhdGVzID0gdGhpcy5wbHVnaW4uaW1hZ2VDYW5kaWRhdGVzKHRoaXMuZm9sZGVyUGF0aCk7XG4gICAgdGhpcy5wbGFuID0gYnVpbGRSZXBhaXJQbGFuKGVtYmVkcywgY2FuZGlkYXRlcywgKGVtYmVkKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGVtYmVkLmxpbmtwYXRoLCB0aGlzLnNvdXJjZUZpbGUucGF0aCk7XG4gICAgICByZXR1cm4gdGFyZ2V0IGluc3RhbmNlb2YgVEZpbGU7XG4gICAgfSk7XG4gICAgdGhpcy5yZW5kZXJQcmV2aWV3KCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclByZXZpZXcoKTogdm9pZCB7XG4gICAgdGhpcy5yZXN1bHRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IGNvdW50cyA9IHRoaXMucGxhbi5yZWR1Y2U8UmVjb3JkPHN0cmluZywgbnVtYmVyPj4oKHJlc3VsdCwgaXRlbSkgPT4ge1xuICAgICAgcmVzdWx0W2l0ZW0uc3RhdHVzXSA9IChyZXN1bHRbaXRlbS5zdGF0dXNdID8/IDApICsgMTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICAgIGNvbnN0IHJlcGFpcmFibGUgPSBjb3VudHMucmVwYWlyYWJsZSA/PyAwO1xuICAgIHRoaXMuYXBwbHlCdXR0b24uc2V0QnV0dG9uVGV4dChgXHU1RTk0XHU3NTI4XHU0RkVFXHU1OTBEICgke3JlcGFpcmFibGV9KWApLnNldERpc2FibGVkKHJlcGFpcmFibGUgPT09IDApO1xuICAgIHRoaXMucmVzdWx0RWwuY3JlYXRlRGl2KHtcbiAgICAgIGNsczogXCJpbWFnZS1yZWxpbmtlci1zdW1tYXJ5XCIsXG4gICAgICB0ZXh0OiBgXHU2MjZCXHU2M0NGICR7dGhpcy5wbGFuLmxlbmd0aH1cdUZGNUNcdTVERjJcdTZCNjNcdTVFMzggJHtjb3VudHMucmVzb2x2ZWQgPz8gMH1cdUZGNUNcdTUzRUZcdTRGRUVcdTU5MEQgJHtyZXBhaXJhYmxlfVx1RkY1Q1x1NjcyQVx1NjI3RVx1NTIzMCAke2NvdW50cy5taXNzaW5nID8/IDB9XHVGRjVDXHU1MUIyXHU3QTgxICR7Y291bnRzLmFtYmlndW91cyA/PyAwfWAsXG4gICAgfSk7XG5cbiAgICB0aGlzLnBsYW4uZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gdGhpcy5yZXN1bHRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiaW1hZ2UtcmVsaW5rZXItcm93XCIgfSk7XG4gICAgICByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJpbWFnZS1yZWxpbmtlci1zdGF0dXNcIiwgdGV4dDogc3RhdHVzTGFiZWwoaXRlbSkgfSk7XG4gICAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IGl0ZW0uZmlsZW5hbWUgfSk7XG4gICAgICByb3cuY3JlYXRlRGl2KHsgY2xzOiBcImltYWdlLXJlbGlua2VyLXBhdGhcIiwgdGV4dDogaXRlbS5yYXcgfSk7XG4gICAgICBpZiAoaXRlbS50YXJnZXQpIHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwiaW1hZ2UtcmVsaW5rZXItcGF0aFwiLCB0ZXh0OiBgXHUyMTkyICR7aXRlbS50YXJnZXQucGF0aH1gIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBseVJlcGFpcnMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY3VycmVudENvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKHRoaXMuc291cmNlRmlsZSk7XG4gICAgaWYgKGN1cnJlbnRDb250ZW50ICE9PSB0aGlzLnNjYW5uZWRDb250ZW50KSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU3QjE0XHU4QkIwXHU1NzI4XHU5ODg0XHU4OUM4XHU1NDBFXHU1REYyXHU1M0QxXHU3NTFGXHU1M0Q4XHU1MzE2XHVGRjFCXHU4QkY3XHU5MUNEXHU2NUIwXHU2MjZCXHU2M0NGXHU1MThEXHU1RTk0XHU3NTI4XHU0RkVFXHU1OTBEXHUzMDAyXCIpO1xuICAgICAgYXdhaXQgdGhpcy5zY2FuQW5kUmVuZGVyKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmFsaWRQbGFuID0gdGhpcy5wbGFuLmZpbHRlcigoaXRlbSkgPT4ge1xuICAgICAgaWYgKGl0ZW0uc3RhdHVzICE9PSBcInJlcGFpcmFibGVcIiB8fCAhaXRlbS50YXJnZXQpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoaXRlbS50YXJnZXQucGF0aCkgaW5zdGFuY2VvZiBURmlsZTtcbiAgICB9KTtcbiAgICBpZiAodmFsaWRQbGFuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShcIlx1NkNBMVx1NjcwOVx1NTNFRlx1NUI4OVx1NTE2OFx1NUU5NFx1NzUyOFx1NzY4NFx1NEZFRVx1NTkwRFx1OTg3OVx1MzAwMlx1OEJGN1x1OTFDRFx1NjVCMFx1NjI2Qlx1NjNDRlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVkID0gYXBwbHlSZXBhaXJQbGFuKGN1cnJlbnRDb250ZW50LCB2YWxpZFBsYW4sICh0YXJnZXQpID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFyZ2V0LnBhdGgpO1xuICAgICAgaWYgKCEodGFyZ2V0RmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkgcmV0dXJuIFwiXCI7XG4gICAgICByZXR1cm4gYCEke3RoaXMuYXBwLmZpbGVNYW5hZ2VyLmdlbmVyYXRlTWFya2Rvd25MaW5rKHRhcmdldEZpbGUsIHRoaXMuc291cmNlRmlsZS5wYXRoKX1gO1xuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeSh0aGlzLnNvdXJjZUZpbGUsIHVwZGF0ZWQpO1xuICAgIG5ldyBOb3RpY2UoYFx1NTZGRVx1NzI0N1x1OTFDRFx1OTRGRVx1NTY2OFx1RkYxQVx1NURGMlx1NEZFRVx1NTkwRCAke3ZhbGlkUGxhbi5sZW5ndGh9IFx1NEUyQVx1NTZGRVx1NzI0N1x1OTRGRVx1NjNBNVx1MzAwMmApO1xuICAgIGF3YWl0IHRoaXMuc2NhbkFuZFJlbmRlcigpO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG4iLCAiZXhwb3J0IHR5cGUgUmVwYWlyU3RhdHVzID0gXCJyZXNvbHZlZFwiIHwgXCJyZXBhaXJhYmxlXCIgfCBcIm1pc3NpbmdcIiB8IFwiYW1iaWd1b3VzXCI7XG5cbmV4cG9ydCB0eXBlIEltYWdlRW1iZWQgPSB7XG4gIHJhdzogc3RyaW5nO1xuICBsaW5rcGF0aDogc3RyaW5nO1xuICBmaWxlbmFtZTogc3RyaW5nO1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbiAgc3R5bGU6IFwibWFya2Rvd25cIiB8IFwid2lraVwiO1xufTtcblxuZXhwb3J0IHR5cGUgQ2FuZGlkYXRlRmlsZSA9IHtcbiAgcGF0aDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgdHlwZSBSZXBhaXJQbGFuSXRlbSA9IEltYWdlRW1iZWQgJiB7XG4gIHN0YXR1czogUmVwYWlyU3RhdHVzO1xuICB0YXJnZXQ/OiBDYW5kaWRhdGVGaWxlO1xufTtcblxuY29uc3QgSU1BR0VfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1xuICBcInBuZ1wiLFxuICBcImpwZ1wiLFxuICBcImpwZWdcIixcbiAgXCJnaWZcIixcbiAgXCJ3ZWJwXCIsXG4gIFwiYm1wXCIsXG4gIFwic3ZnXCIsXG4gIFwiYXZpZlwiLFxuXSk7XG5cbmNvbnN0IElNQUdFX0VNQkVEID0gLyFcXFtbXlxcXV0qXFxdXFwoKD88bWFya2Rvd24+W14pXFxzXSspKD86XFxzKyg/OlwiW15cIl0qXCJ8J1teJ10qJykpP1xcKXwhXFxbXFxbKD88d2lraT5bXlxcXXwjXSspKD86W3wjXVteXFxdXSopP1xcXVxcXS9nO1xuXG5mdW5jdGlvbiBkZWNvZGVQYXRoKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmlsZW5hbWVGcm9tUGF0aChsaW5rcGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGVjb2RlZCA9IGRlY29kZVBhdGgobGlua3BhdGgpLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuICByZXR1cm4gZGVjb2RlZC5zbGljZShkZWNvZGVkLmxhc3RJbmRleE9mKFwiL1wiKSArIDEpO1xufVxuXG5mdW5jdGlvbiBpc0ltYWdlRmlsZW5hbWUoZmlsZW5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBleHRlbnNpb24gPSBmaWxlbmFtZS5zbGljZShmaWxlbmFtZS5sYXN0SW5kZXhPZihcIi5cIikgKyAxKS50b0xvd2VyQ2FzZSgpO1xuICByZXR1cm4gSU1BR0VfRVhURU5TSU9OUy5oYXMoZXh0ZW5zaW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5JbWFnZUVtYmVkcyhtYXJrZG93bjogc3RyaW5nKTogSW1hZ2VFbWJlZFtdIHtcbiAgY29uc3QgZW1iZWRzOiBJbWFnZUVtYmVkW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IG1hdGNoIG9mIG1hcmtkb3duLm1hdGNoQWxsKElNQUdFX0VNQkVEKSkge1xuICAgIGNvbnN0IGxpbmtwYXRoID0gbWF0Y2guZ3JvdXBzPy5tYXJrZG93biA/PyBtYXRjaC5ncm91cHM/Lndpa2k7XG4gICAgaWYgKCFsaW5rcGF0aCB8fCBtYXRjaC5pbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlbmFtZSA9IGZpbGVuYW1lRnJvbVBhdGgobGlua3BhdGgpO1xuICAgIGlmICghaXNJbWFnZUZpbGVuYW1lKGZpbGVuYW1lKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZW1iZWRzLnB1c2goe1xuICAgICAgcmF3OiBtYXRjaFswXSxcbiAgICAgIGxpbmtwYXRoLFxuICAgICAgZmlsZW5hbWUsXG4gICAgICBzdGFydDogbWF0Y2guaW5kZXgsXG4gICAgICBlbmQ6IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxuICAgICAgc3R5bGU6IG1hdGNoLmdyb3Vwcz8ubWFya2Rvd24gPyBcIm1hcmtkb3duXCIgOiBcIndpa2lcIixcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBlbWJlZHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFJlcGFpclBsYW4oXG4gIGVtYmVkczogSW1hZ2VFbWJlZFtdLFxuICBjYW5kaWRhdGVzOiBDYW5kaWRhdGVGaWxlW10sXG4gIGlzUmVzb2x2ZWQ6IChlbWJlZDogSW1hZ2VFbWJlZCkgPT4gYm9vbGVhbixcbik6IFJlcGFpclBsYW5JdGVtW10ge1xuICByZXR1cm4gZW1iZWRzLm1hcCgoZW1iZWQpID0+IHtcbiAgICBpZiAoaXNSZXNvbHZlZChlbWJlZCkpIHtcbiAgICAgIHJldHVybiB7IC4uLmVtYmVkLCBzdGF0dXM6IFwicmVzb2x2ZWRcIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXMgPSBjYW5kaWRhdGVzLmZpbHRlcihcbiAgICAgIChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5uYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT09IGVtYmVkLmZpbGVuYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCksXG4gICAgKTtcblxuICAgIGlmIChtYXRjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIHsgLi4uZW1iZWQsIHN0YXR1czogXCJyZXBhaXJhYmxlXCIsIHRhcmdldDogbWF0Y2hlc1swXSB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IC4uLmVtYmVkLCBzdGF0dXM6IG1hdGNoZXMubGVuZ3RoID09PSAwID8gXCJtaXNzaW5nXCIgOiBcImFtYmlndW91c1wiIH07XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSZXBhaXJQbGFuKFxuICBtYXJrZG93bjogc3RyaW5nLFxuICBwbGFuOiBSZXBhaXJQbGFuSXRlbVtdLFxuICBjcmVhdGVFbWJlZDogKHRhcmdldDogQ2FuZGlkYXRlRmlsZSwgb3JpZ2luYWw6IEltYWdlRW1iZWQpID0+IHN0cmluZyxcbik6IHN0cmluZyB7XG4gIGNvbnN0IHJlcGFpcnMgPSBwbGFuXG4gICAgLmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgUmVwYWlyUGxhbkl0ZW0gJiB7IHRhcmdldDogQ2FuZGlkYXRlRmlsZSB9ID0+IGl0ZW0uc3RhdHVzID09PSBcInJlcGFpcmFibGVcIiAmJiAhIWl0ZW0udGFyZ2V0KVxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuc3RhcnQgLSBsZWZ0LnN0YXJ0KTtcblxuICByZXR1cm4gcmVwYWlycy5yZWR1Y2UoXG4gICAgKHVwZGF0ZWQsIGl0ZW0pID0+IGAke3VwZGF0ZWQuc2xpY2UoMCwgaXRlbS5zdGFydCl9JHtjcmVhdGVFbWJlZChpdGVtLnRhcmdldCwgaXRlbSl9JHt1cGRhdGVkLnNsaWNlKGl0ZW0uZW5kKX1gLFxuICAgIG1hcmtkb3duLFxuICApO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFVTzs7O0FDV1AsSUFBTSxtQkFBbUIsb0JBQUksSUFBSTtBQUFBLEVBQy9CO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUNGLENBQUM7QUFFRCxJQUFNLGNBQWM7QUFFcEIs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
