export type RepairStatus = "resolved" | "repairable" | "missing" | "ambiguous";

export type ImageEmbed = {
  raw: string;
  linkpath: string;
  filename: string;
  start: number;
  end: number;
  style: "markdown" | "wiki";
};

export type CandidateFile = {
  path: string;
  name: string;
};

export type RepairPlanItem = ImageEmbed & {
  status: RepairStatus;
  target?: CandidateFile;
};

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
]);

const IMAGE_EMBED = /!\[[^\]]*\]\((?<markdown>[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)|!\[\[(?<wiki>[^\]|#]+)(?:[|#][^\]]*)?\]\]/g;

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function filenameFromPath(linkpath: string): string {
  const decoded = decodePath(linkpath).replace(/\\/g, "/");
  return decoded.slice(decoded.lastIndexOf("/") + 1);
}

function isImageFilename(filename: string): boolean {
  const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}

export function scanImageEmbeds(markdown: string): ImageEmbed[] {
  const embeds: ImageEmbed[] = [];

  for (const match of markdown.matchAll(IMAGE_EMBED)) {
    const linkpath = match.groups?.markdown ?? match.groups?.wiki;
    if (!linkpath || match.index === undefined) {
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
      style: match.groups?.markdown ? "markdown" : "wiki",
    });
  }

  return embeds;
}

export function buildRepairPlan(
  embeds: ImageEmbed[],
  candidates: CandidateFile[],
  isResolved: (embed: ImageEmbed) => boolean,
): RepairPlanItem[] {
  return embeds.map((embed) => {
    if (isResolved(embed)) {
      return { ...embed, status: "resolved" };
    }

    const matches = candidates.filter(
      (candidate) => candidate.name.toLocaleLowerCase() === embed.filename.toLocaleLowerCase(),
    );

    if (matches.length === 1) {
      return { ...embed, status: "repairable", target: matches[0] };
    }

    return { ...embed, status: matches.length === 0 ? "missing" : "ambiguous" };
  });
}

export function applyRepairPlan(
  markdown: string,
  plan: RepairPlanItem[],
  createEmbed: (target: CandidateFile, original: ImageEmbed) => string,
): string {
  const repairs = plan
    .filter((item): item is RepairPlanItem & { target: CandidateFile } => item.status === "repairable" && !!item.target)
    .sort((left, right) => right.start - left.start);

  return repairs.reduce(
    (updated, item) => `${updated.slice(0, item.start)}${createEmbed(item.target, item)}${updated.slice(item.end)}`,
    markdown,
  );
}
