import assert from "node:assert/strict";
import test from "node:test";
import { applyRepairPlan, buildRepairPlan, scanImageEmbeds } from "../src/link-repair.ts";

test("extracts Markdown and Wiki image embeds with their source ranges", () => {
  const markdown = "![cover](images/a.png)\n![[old/b.jpg|200]]";

  assert.deepEqual(scanImageEmbeds(markdown), [
    {
      raw: "![cover](images/a.png)",
      linkpath: "images/a.png",
      filename: "a.png",
      start: 0,
      end: 22,
      style: "markdown",
    },
    {
      raw: "![[old/b.jpg|200]]",
      linkpath: "old/b.jpg",
      filename: "b.jpg",
      start: 23,
      end: 41,
      style: "wiki",
    },
  ]);
});

test("replaces only repairable embeds from right to left", () => {
  const markdown = "![one](old/a.png)\n![two](old/b.jpg)";
  const embeds = scanImageEmbeds(markdown);
  const plan = buildRepairPlan(
    embeds,
    [
      { path: "90-Attachments/a.png", name: "a.png" },
      { path: "90-Attachments/b.jpg", name: "b.jpg" },
    ],
    () => false,
  );

  assert.equal(
    applyRepairPlan(markdown, plan, (target) => `![[${target.name}]]`),
    "![[a.png]]\n![[b.jpg]]",
  );
});

test("plans only unique unresolved filename matches for repair", () => {
  const embeds = scanImageEmbeds([
    "![resolved](already/a.png)",
    "![repair](old/b.jpg)",
    "![missing](old/c.webp)",
    "![[old/d.png]]",
  ].join("\n"));

  const plan = buildRepairPlan(
    embeds,
    [
      { path: "90-Attachments/b.jpg", name: "b.jpg" },
      { path: "90-Attachments/d.png", name: "d.png" },
      { path: "archive/d.png", name: "d.png" },
    ],
    (embed) => embed.filename === "a.png",
  );

  assert.deepEqual(plan.map((item) => item.status), [
    "resolved",
    "repairable",
    "missing",
    "ambiguous",
  ]);
  assert.equal(plan[1].target?.path, "90-Attachments/b.jpg");
  assert.equal(plan[2].target, undefined);
  assert.equal(plan[3].target, undefined);
});
