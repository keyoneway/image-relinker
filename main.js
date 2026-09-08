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
      folders.forEach((path) => dropdown.addOption(path, path));
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xpbmstcmVwYWlyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIEJ1dHRvbkNvbXBvbmVudCxcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGx1Z2luLFxuICBTZXR0aW5nLFxuICBURmlsZSxcbiAgVEZvbGRlcixcbiAgbm9ybWFsaXplUGF0aCxcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBhcHBseVJlcGFpclBsYW4sXG4gIGJ1aWxkUmVwYWlyUGxhbixcbiAgQ2FuZGlkYXRlRmlsZSxcbiAgUmVwYWlyUGxhbkl0ZW0sXG4gIHNjYW5JbWFnZUVtYmVkcyxcbn0gZnJvbSBcIi4vbGluay1yZXBhaXJcIjtcblxuY29uc3QgSU1BR0VfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1wicG5nXCIsIFwianBnXCIsIFwianBlZ1wiLCBcImdpZlwiLCBcIndlYnBcIiwgXCJibXBcIiwgXCJzdmdcIiwgXCJhdmlmXCJdKTtcblxuZnVuY3Rpb24gaXNJbWFnZUZpbGUoZmlsZTogVEZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIElNQUdFX0VYVEVOU0lPTlMuaGFzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpO1xufVxuXG5mdW5jdGlvbiBpc0luc2lkZUZvbGRlcihmaWxlOiBURmlsZSwgZm9sZGVyUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICghZm9sZGVyUGF0aCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtmb2xkZXJQYXRofS9gKTtcbn1cblxuZnVuY3Rpb24gc3RhdHVzTGFiZWwoaXRlbTogUmVwYWlyUGxhbkl0ZW0pOiBzdHJpbmcge1xuICBzd2l0Y2ggKGl0ZW0uc3RhdHVzKSB7XG4gICAgY2FzZSBcInJlc29sdmVkXCI6IHJldHVybiBcIlx1NURGMlx1NkI2M1x1NUUzOFwiO1xuICAgIGNhc2UgXCJyZXBhaXJhYmxlXCI6IHJldHVybiBcIlx1NTNFRlx1NEZFRVx1NTkwRFwiO1xuICAgIGNhc2UgXCJtaXNzaW5nXCI6IHJldHVybiBcIlx1NjcyQVx1NjI3RVx1NTIzMFwiO1xuICAgIGNhc2UgXCJhbWJpZ3VvdXNcIjogcmV0dXJuIFwiXHU5MUNEXHU1NDBEXHU1MUIyXHU3QTgxXCI7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1hZ2VSZWxpbmtlclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwicmVwYWlyLWFjdGl2ZS1ub3RlXCIsXG4gICAgICBuYW1lOiBcIlx1NEZFRVx1NTkwRFx1NUY1M1x1NTI0RFx1N0IxNFx1OEJCMFx1NTZGRVx1NzI0N1wiLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgICBjb25zdCBjYW5SZXBhaXIgPSBmaWxlIGluc3RhbmNlb2YgVEZpbGUgJiYgZmlsZS5leHRlbnNpb24gPT09IFwibWRcIjtcbiAgICAgICAgaWYgKGNhblJlcGFpciAmJiAhY2hlY2tpbmcpIHRoaXMub3BlblJlcGFpck1vZGFsKGZpbGUpO1xuICAgICAgICByZXR1cm4gY2FuUmVwYWlyO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlLW1lbnVcIiwgKG1lbnUsIGZpbGUpID0+IHtcbiAgICAgIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkgfHwgZmlsZS5leHRlbnNpb24gIT09IFwibWRcIikgcmV0dXJuO1xuICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiBpdGVtXG4gICAgICAgIC5zZXRUaXRsZShcIlx1NTZGRVx1NzI0N1x1OTFDRFx1OTRGRVx1NTY2OFx1RkYxQVx1NEZFRVx1NTkwRFx1NTZGRVx1NzI0N1x1OTRGRVx1NjNBNVwiKVxuICAgICAgICAuc2V0SWNvbihcImltYWdlXCIpXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMub3BlblJlcGFpck1vZGFsKGZpbGUpKSk7XG4gICAgfSkpO1xuICB9XG5cbiAgb3BlblJlcGFpck1vZGFsKGZpbGU6IFRGaWxlKTogdm9pZCB7XG4gICAgbmV3IEltYWdlUmVwYWlyTW9kYWwodGhpcy5hcHAsIHRoaXMsIGZpbGUpLm9wZW4oKTtcbiAgfVxuXG4gIGRlZmF1bHRBdHRhY2htZW50Rm9sZGVyKCk6IHN0cmluZyB7XG4gICAgY29uc3QgY29uZmlndXJlZCA9ICh0aGlzLmFwcC52YXVsdCBhcyB1bmtub3duIGFzIHtcbiAgICAgIGdldENvbmZpZzogKGtleTogc3RyaW5nKSA9PiB1bmtub3duO1xuICAgIH0pLmdldENvbmZpZyhcImF0dGFjaG1lbnRGb2xkZXJQYXRoXCIpO1xuICAgIHJldHVybiB0eXBlb2YgY29uZmlndXJlZCA9PT0gXCJzdHJpbmdcIiA/IG5vcm1hbGl6ZVBhdGgoY29uZmlndXJlZCkgOiBcIlwiO1xuICB9XG5cbiAgdmF1bHRGb2xkZXJzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKVxuICAgICAgLmZpbHRlcigoZmlsZSk6IGZpbGUgaXMgVEZvbGRlciA9PiBmaWxlIGluc3RhbmNlb2YgVEZvbGRlcilcbiAgICAgIC5tYXAoKGZvbGRlcikgPT4gZm9sZGVyLnBhdGgpXG4gICAgICAuZmlsdGVyKChwYXRoKSA9PiBwYXRoLmxlbmd0aCA+IDApXG4gICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpO1xuICB9XG5cbiAgaW1hZ2VDYW5kaWRhdGVzKGZvbGRlclBhdGg6IHN0cmluZyk6IENhbmRpZGF0ZUZpbGVbXSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGlzSW1hZ2VGaWxlKGZpbGUpICYmIGlzSW5zaWRlRm9sZGVyKGZpbGUsIGZvbGRlclBhdGgpKVxuICAgICAgLm1hcCgoZmlsZSkgPT4gKHsgcGF0aDogZmlsZS5wYXRoLCBuYW1lOiBmaWxlLm5hbWUgfSkpO1xuICB9XG59XG5cbmNsYXNzIEltYWdlUmVwYWlyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgZm9sZGVyUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIHBsYW46IFJlcGFpclBsYW5JdGVtW10gPSBbXTtcbiAgcHJpdmF0ZSBzY2FubmVkQ29udGVudCA9IFwiXCI7XG4gIHByaXZhdGUgcmVzdWx0RWwhOiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSBhcHBseUJ1dHRvbiE6IEJ1dHRvbkNvbXBvbmVudDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogSW1hZ2VSZWxpbmtlclBsdWdpbixcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZUZpbGU6IFRGaWxlLFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuZm9sZGVyUGF0aCA9IHBsdWdpbi5kZWZhdWx0QXR0YWNobWVudEZvbGRlcigpO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJcdTRGRUVcdTU5MERcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcdTU2RkVcdTcyNDdcdTk0RkVcdTYzQTVcIiB9KTtcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiXHU0RUM1XHU2MzA5XHU2NTg3XHU0RUY2XHU1NDBEXHU1NTJGXHU0RTAwXHU1MzM5XHU5MTREXHVGRjFCXHU2MjZCXHU2M0NGXHU5NjM2XHU2QkI1XHU0RTBEXHU0RjFBXHU0RkVFXHU2NTM5XHU3QjE0XHU4QkIwXHU2MjE2XHU5NjQ0XHU0RUY2XHUzMDAyXCIsXG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlx1OTY0NFx1NEVGNlx1NzZFRVx1NUY1NVwiKVxuICAgICAgLnNldERlc2MoXCJcdTlFRDhcdThCQTRcdThCRkJcdTUzRDYgT2JzaWRpYW4gXHU3Njg0XHU5NjQ0XHU0RUY2XHU3NkVFXHU1RjU1XHU4QkJFXHU3RjZFXHVGRjBDXHU1M0VGXHU2NTM5XHU5MDA5XHU0RUZCXHU2MTBGXHU1RTkzXHU1MTg1XHU3NkVFXHU1RjU1XHUzMDAyXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLnBsdWdpbi52YXVsdEZvbGRlcnMoKTtcbiAgICAgICAgaWYgKHRoaXMuZm9sZGVyUGF0aCAmJiAhZm9sZGVycy5pbmNsdWRlcyh0aGlzLmZvbGRlclBhdGgpKSBmb2xkZXJzLnVuc2hpZnQodGhpcy5mb2xkZXJQYXRoKTtcbiAgICAgICAgZm9sZGVycy5mb3JFYWNoKChwYXRoKSA9PiBkcm9wZG93bi5hZGRPcHRpb24ocGF0aCwgcGF0aCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLmZvbGRlclBhdGgpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMuZm9sZGVyUGF0aCA9IG5vcm1hbGl6ZVBhdGgodmFsdWUpO1xuICAgICAgICAgIHRoaXMuY2xlYXJQcmV2aWV3KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IGJ1dHRvblxuICAgICAgICAuc2V0QnV0dG9uVGV4dChcIlx1NjI2Qlx1NjNDRlx1NUU3Nlx1OTg4NFx1ODlDOFwiKVxuICAgICAgICAuc2V0Q3RhKClcbiAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4gdGhpcy5zY2FuQW5kUmVuZGVyKCkpKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgIHRoaXMuYXBwbHlCdXR0b24gPSBidXR0b25cbiAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIlx1NUU5NFx1NzUyOFx1NEZFRVx1NTkwRFwiKVxuICAgICAgICAgIC5zZXREaXNhYmxlZCh0cnVlKVxuICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHRoaXMuYXBwbHlSZXBhaXJzKCkpO1xuICAgICAgfSk7XG5cbiAgICB0aGlzLnJlc3VsdEVsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJpbWFnZS1yZWxpbmtlci1yZXN1bHRzXCIgfSk7XG4gIH1cblxuICBwcml2YXRlIGNsZWFyUHJldmlldygpOiB2b2lkIHtcbiAgICB0aGlzLnBsYW4gPSBbXTtcbiAgICB0aGlzLnNjYW5uZWRDb250ZW50ID0gXCJcIjtcbiAgICB0aGlzLmFwcGx5QnV0dG9uPy5zZXREaXNhYmxlZCh0cnVlKTtcbiAgICB0aGlzLnJlc3VsdEVsPy5lbXB0eSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzY2FuQW5kUmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLmZvbGRlclBhdGgpO1xuICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSB7XG4gICAgICBuZXcgTm90aWNlKGBcdTY3MkFcdTYyN0VcdTUyMzBcdTk2NDRcdTRFRjZcdTc2RUVcdTVGNTVcdUZGMUEke3RoaXMuZm9sZGVyUGF0aCB8fCBcIlx1RkYwOFx1NjcyQVx1OEJCRVx1N0Y2RVx1RkYwOVwifWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2Nhbm5lZENvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKHRoaXMuc291cmNlRmlsZSk7XG4gICAgY29uc3QgZW1iZWRzID0gc2NhbkltYWdlRW1iZWRzKHRoaXMuc2Nhbm5lZENvbnRlbnQpO1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLnBsdWdpbi5pbWFnZUNhbmRpZGF0ZXModGhpcy5mb2xkZXJQYXRoKTtcbiAgICB0aGlzLnBsYW4gPSBidWlsZFJlcGFpclBsYW4oZW1iZWRzLCBjYW5kaWRhdGVzLCAoZW1iZWQpID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZW1iZWQubGlua3BhdGgsIHRoaXMuc291cmNlRmlsZS5wYXRoKTtcbiAgICAgIHJldHVybiB0YXJnZXQgaW5zdGFuY2VvZiBURmlsZTtcbiAgICB9KTtcbiAgICB0aGlzLnJlbmRlclByZXZpZXcoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyUHJldmlldygpOiB2b2lkIHtcbiAgICB0aGlzLnJlc3VsdEVsLmVtcHR5KCk7XG4gICAgY29uc3QgY291bnRzID0gdGhpcy5wbGFuLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PigocmVzdWx0LCBpdGVtKSA9PiB7XG4gICAgICByZXN1bHRbaXRlbS5zdGF0dXNdID0gKHJlc3VsdFtpdGVtLnN0YXR1c10gPz8gMCkgKyAxO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSk7XG4gICAgY29uc3QgcmVwYWlyYWJsZSA9IGNvdW50cy5yZXBhaXJhYmxlID8/IDA7XG4gICAgdGhpcy5hcHBseUJ1dHRvbi5zZXRCdXR0b25UZXh0KGBcdTVFOTRcdTc1MjhcdTRGRUVcdTU5MEQgKCR7cmVwYWlyYWJsZX0pYCkuc2V0RGlzYWJsZWQocmVwYWlyYWJsZSA9PT0gMCk7XG4gICAgdGhpcy5yZXN1bHRFbC5jcmVhdGVEaXYoe1xuICAgICAgY2xzOiBcImltYWdlLXJlbGlua2VyLXN1bW1hcnlcIixcbiAgICAgIHRleHQ6IGBcdTYyNkJcdTYzQ0YgJHt0aGlzLnBsYW4ubGVuZ3RofVx1RkY1Q1x1NURGMlx1NkI2M1x1NUUzOCAke2NvdW50cy5yZXNvbHZlZCA/PyAwfVx1RkY1Q1x1NTNFRlx1NEZFRVx1NTkwRCAke3JlcGFpcmFibGV9XHVGRjVDXHU2NzJBXHU2MjdFXHU1MjMwICR7Y291bnRzLm1pc3NpbmcgPz8gMH1cdUZGNUNcdTUxQjJcdTdBODEgJHtjb3VudHMuYW1iaWd1b3VzID8/IDB9YCxcbiAgICB9KTtcblxuICAgIHRoaXMucGxhbi5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSB0aGlzLnJlc3VsdEVsLmNyZWF0ZURpdih7IGNsczogXCJpbWFnZS1yZWxpbmtlci1yb3dcIiB9KTtcbiAgICAgIHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcImltYWdlLXJlbGlua2VyLXN0YXR1c1wiLCB0ZXh0OiBzdGF0dXNMYWJlbChpdGVtKSB9KTtcbiAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogaXRlbS5maWxlbmFtZSB9KTtcbiAgICAgIHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwiaW1hZ2UtcmVsaW5rZXItcGF0aFwiLCB0ZXh0OiBpdGVtLnJhdyB9KTtcbiAgICAgIGlmIChpdGVtLnRhcmdldCkgcm93LmNyZWF0ZURpdih7IGNsczogXCJpbWFnZS1yZWxpbmtlci1wYXRoXCIsIHRleHQ6IGBcdTIxOTIgJHtpdGVtLnRhcmdldC5wYXRofWAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGFwcGx5UmVwYWlycygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodGhpcy5zb3VyY2VGaWxlKTtcbiAgICBpZiAoY3VycmVudENvbnRlbnQgIT09IHRoaXMuc2Nhbm5lZENvbnRlbnQpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTdCMTRcdThCQjBcdTU3MjhcdTk4ODRcdTg5QzhcdTU0MEVcdTVERjJcdTUzRDFcdTc1MUZcdTUzRDhcdTUzMTZcdUZGMUJcdThCRjdcdTkxQ0RcdTY1QjBcdTYyNkJcdTYzQ0ZcdTUxOERcdTVFOTRcdTc1MjhcdTRGRUVcdTU5MERcdTMwMDJcIik7XG4gICAgICBhd2FpdCB0aGlzLnNjYW5BbmRSZW5kZXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB2YWxpZFBsYW4gPSB0aGlzLnBsYW4uZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICBpZiAoaXRlbS5zdGF0dXMgIT09IFwicmVwYWlyYWJsZVwiIHx8ICFpdGVtLnRhcmdldCkgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChpdGVtLnRhcmdldC5wYXRoKSBpbnN0YW5jZW9mIFRGaWxlO1xuICAgIH0pO1xuICAgIGlmICh2YWxpZFBsYW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU2Q0ExXHU2NzA5XHU1M0VGXHU1Qjg5XHU1MTY4XHU1RTk0XHU3NTI4XHU3Njg0XHU0RkVFXHU1OTBEXHU5ODc5XHUzMDAyXHU4QkY3XHU5MUNEXHU2NUIwXHU2MjZCXHU2M0NGXHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0ZWQgPSBhcHBseVJlcGFpclBsYW4oY3VycmVudENvbnRlbnQsIHZhbGlkUGxhbiwgKHRhcmdldCkgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0RmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXQucGF0aCk7XG4gICAgICBpZiAoISh0YXJnZXRGaWxlIGluc3RhbmNlb2YgVEZpbGUpKSByZXR1cm4gXCJcIjtcbiAgICAgIHJldHVybiBgISR7dGhpcy5hcHAuZmlsZU1hbmFnZXIuZ2VuZXJhdGVNYXJrZG93bkxpbmsodGFyZ2V0RmlsZSwgdGhpcy5zb3VyY2VGaWxlLnBhdGgpfWA7XG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KHRoaXMuc291cmNlRmlsZSwgdXBkYXRlZCk7XG4gICAgbmV3IE5vdGljZShgXHU1NkZFXHU3MjQ3XHU5MUNEXHU5NEZFXHU1NjY4XHVGRjFBXHU1REYyXHU0RkVFXHU1OTBEICR7dmFsaWRQbGFuLmxlbmd0aH0gXHU0RTJBXHU1NkZFXHU3MjQ3XHU5NEZFXHU2M0E1XHUzMDAyYCk7XG4gICAgYXdhaXQgdGhpcy5zY2FuQW5kUmVuZGVyKCk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBSZXBhaXJTdGF0dXMgPSBcInJlc29sdmVkXCIgfCBcInJlcGFpcmFibGVcIiB8IFwibWlzc2luZ1wiIHwgXCJhbWJpZ3VvdXNcIjtcblxuZXhwb3J0IHR5cGUgSW1hZ2VFbWJlZCA9IHtcbiAgcmF3OiBzdHJpbmc7XG4gIGxpbmtwYXRoOiBzdHJpbmc7XG4gIGZpbGVuYW1lOiBzdHJpbmc7XG4gIHN0YXJ0OiBudW1iZXI7XG4gIGVuZDogbnVtYmVyO1xuICBzdHlsZTogXCJtYXJrZG93blwiIHwgXCJ3aWtpXCI7XG59O1xuXG5leHBvcnQgdHlwZSBDYW5kaWRhdGVGaWxlID0ge1xuICBwYXRoOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFJlcGFpclBsYW5JdGVtID0gSW1hZ2VFbWJlZCAmIHtcbiAgc3RhdHVzOiBSZXBhaXJTdGF0dXM7XG4gIHRhcmdldD86IENhbmRpZGF0ZUZpbGU7XG59O1xuXG5jb25zdCBJTUFHRV9FWFRFTlNJT05TID0gbmV3IFNldChbXG4gIFwicG5nXCIsXG4gIFwianBnXCIsXG4gIFwianBlZ1wiLFxuICBcImdpZlwiLFxuICBcIndlYnBcIixcbiAgXCJibXBcIixcbiAgXCJzdmdcIixcbiAgXCJhdmlmXCIsXG5dKTtcblxuY29uc3QgSU1BR0VfRU1CRUQgPSAvIVxcW1teXFxdXSpcXF1cXCgoPzxtYXJrZG93bj5bXilcXHNdKykoPzpcXHMrKD86XCJbXlwiXSpcInwnW14nXSonKSk/XFwpfCFcXFtcXFsoPzx3aWtpPlteXFxdfCNdKykoPzpbfCNdW15cXF1dKik/XFxdXFxdL2c7XG5cbmZ1bmN0aW9uIGRlY29kZVBhdGgodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaWxlbmFtZUZyb21QYXRoKGxpbmtwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkZWNvZGVkID0gZGVjb2RlUGF0aChsaW5rcGF0aCkucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG4gIHJldHVybiBkZWNvZGVkLnNsaWNlKGRlY29kZWQubGFzdEluZGV4T2YoXCIvXCIpICsgMSk7XG59XG5cbmZ1bmN0aW9uIGlzSW1hZ2VGaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVuYW1lLnNsaWNlKGZpbGVuYW1lLmxhc3RJbmRleE9mKFwiLlwiKSArIDEpLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBJTUFHRV9FWFRFTlNJT05TLmhhcyhleHRlbnNpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbkltYWdlRW1iZWRzKG1hcmtkb3duOiBzdHJpbmcpOiBJbWFnZUVtYmVkW10ge1xuICBjb25zdCBlbWJlZHM6IEltYWdlRW1iZWRbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgbWF0Y2ggb2YgbWFya2Rvd24ubWF0Y2hBbGwoSU1BR0VfRU1CRUQpKSB7XG4gICAgY29uc3QgbGlua3BhdGggPSBtYXRjaC5ncm91cHM/Lm1hcmtkb3duID8/IG1hdGNoLmdyb3Vwcz8ud2lraTtcbiAgICBpZiAoIWxpbmtwYXRoIHx8IG1hdGNoLmluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVuYW1lID0gZmlsZW5hbWVGcm9tUGF0aChsaW5rcGF0aCk7XG4gICAgaWYgKCFpc0ltYWdlRmlsZW5hbWUoZmlsZW5hbWUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBlbWJlZHMucHVzaCh7XG4gICAgICByYXc6IG1hdGNoWzBdLFxuICAgICAgbGlua3BhdGgsXG4gICAgICBmaWxlbmFtZSxcbiAgICAgIHN0YXJ0OiBtYXRjaC5pbmRleCxcbiAgICAgIGVuZDogbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgsXG4gICAgICBzdHlsZTogbWF0Y2guZ3JvdXBzPy5tYXJrZG93biA/IFwibWFya2Rvd25cIiA6IFwid2lraVwiLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGVtYmVkcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUmVwYWlyUGxhbihcbiAgZW1iZWRzOiBJbWFnZUVtYmVkW10sXG4gIGNhbmRpZGF0ZXM6IENhbmRpZGF0ZUZpbGVbXSxcbiAgaXNSZXNvbHZlZDogKGVtYmVkOiBJbWFnZUVtYmVkKSA9PiBib29sZWFuLFxuKTogUmVwYWlyUGxhbkl0ZW1bXSB7XG4gIHJldHVybiBlbWJlZHMubWFwKChlbWJlZCkgPT4ge1xuICAgIGlmIChpc1Jlc29sdmVkKGVtYmVkKSkge1xuICAgICAgcmV0dXJuIHsgLi4uZW1iZWQsIHN0YXR1czogXCJyZXNvbHZlZFwiIH07XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlcyA9IGNhbmRpZGF0ZXMuZmlsdGVyKFxuICAgICAgKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLm5hbWUudG9Mb2NhbGVMb3dlckNhc2UoKSA9PT0gZW1iZWQuZmlsZW5hbWUudG9Mb2NhbGVMb3dlckNhc2UoKSxcbiAgICApO1xuXG4gICAgaWYgKG1hdGNoZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4geyAuLi5lbWJlZCwgc3RhdHVzOiBcInJlcGFpcmFibGVcIiwgdGFyZ2V0OiBtYXRjaGVzWzBdIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgLi4uZW1iZWQsIHN0YXR1czogbWF0Y2hlcy5sZW5ndGggPT09IDAgPyBcIm1pc3NpbmdcIiA6IFwiYW1iaWd1b3VzXCIgfTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJlcGFpclBsYW4oXG4gIG1hcmtkb3duOiBzdHJpbmcsXG4gIHBsYW46IFJlcGFpclBsYW5JdGVtW10sXG4gIGNyZWF0ZUVtYmVkOiAodGFyZ2V0OiBDYW5kaWRhdGVGaWxlLCBvcmlnaW5hbDogSW1hZ2VFbWJlZCkgPT4gc3RyaW5nLFxuKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwYWlycyA9IHBsYW5cbiAgICAuZmlsdGVyKChpdGVtKTogaXRlbSBpcyBSZXBhaXJQbGFuSXRlbSAmIHsgdGFyZ2V0OiBDYW5kaWRhdGVGaWxlIH0gPT4gaXRlbS5zdGF0dXMgPT09IFwicmVwYWlyYWJsZVwiICYmICEhaXRlbS50YXJnZXQpXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5zdGFydCAtIGxlZnQuc3RhcnQpO1xuXG4gIHJldHVybiByZXBhaXJzLnJlZHVjZShcbiAgICAodXBkYXRlZCwgaXRlbSkgPT4gYCR7dXBkYXRlZC5zbGljZSgwLCBpdGVtLnN0YXJ0KX0ke2NyZWF0ZUVtYmVkKGl0ZW0udGFyZ2V0LCBpdGVtKX0ke3VwZGF0ZWQuc2xpY2UoaXRlbS5lbmQpfWAsXG4gICAgbWFya2Rvd24sXG4gICk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQVVPOzs7QUNXUCxJQUFNLG1CQUFtQixvQkFBSSxJQUFJO0FBQUEsRUFDL0I7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0YsQ0FBQztBQUVELElBQU0sY0FBYztBQUVwQixTQUFTLFdBQVcsT0FBdUI7QUFDekMsTUFB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
