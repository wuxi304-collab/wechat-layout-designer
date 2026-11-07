import assert from "node:assert/strict";
import test from "node:test";
import { appendCheckpoint, MAX_CHECKPOINTS, readDraftArchive } from "../lib/editor/draft-storage.ts";

const defaults = { markdown: "示例", markdownStyle: "jiangnan", theme: "national", layoutMode: "calm", fontProfile: "classic", fontSize: 18, lineHeight: 1.94, titleScale: 1, articleTracking: .008 };

test("legacy drafts migrate once and retain an intentionally empty manuscript", () => {
  const legacy = readDraftArchive(JSON.stringify({ schemaVersion: 6, markdown: "", fontSize: 17, markdownStyle: "technical", theme: "national" }), defaults);
  assert.equal(legacy.schemaVersion, 8);
  assert.equal(legacy.markdown, ""); assert.equal(legacy.fontSize, 18);
  assert.deepEqual(legacy.versions, []);
  const current = readDraftArchive(JSON.stringify(legacy), defaults);
  assert.equal(current.fontSize, 18);
});

test("checkpoints round-trip source and typography and keep only the latest twelve", () => {
  let versions = [];
  const snapshot = { ...defaults, markdown: "# C++\r\n\r\n**316L**\n", markdownStyle: "technical", fontSize: 17, lineHeight: 1.8 };
  versions = appendCheckpoint(versions, snapshot, "清空前", 1000);
  snapshot.markdown = "后续修改";
  assert.equal(versions[0].snapshot.markdown, "# C++\r\n\r\n**316L**\n");
  for (let index = 0; index < 14; index++) versions = appendCheckpoint(versions, { ...defaults, markdown: String(index) }, "编辑前", index + 1001);
  assert.equal(versions.length, MAX_CHECKPOINTS);
  const stored = readDraftArchive(JSON.stringify({ ...defaults, schemaVersion: 8, updatedAt: 2000, versions }), defaults);
  assert.deepEqual(stored.versions, versions);
  assert.equal(appendCheckpoint(versions, versions.at(-1).snapshot, "重复"), versions);
});

test("corrupt or future drafts cannot be mistaken for blank drafts, and unsafe settings are bounded", () => {
  assert.throws(() => readDraftArchive("{", defaults), /暂停覆盖/);
  assert.throws(() => readDraftArchive('{"schemaVersion":99,"markdown":"不可覆盖"}', defaults), /暂不支持/);
  assert.throws(() => readDraftArchive('{"schemaVersion":8}', defaults), /不完整/);
  const current = readDraftArchive(JSON.stringify({ ...defaults, schemaVersion: 8, fontSize: -50, lineHeight: 100, theme: "__proto__", versions: [{ id: "x", label: "坏记录", createdAt: 1, snapshot: null }] }), defaults);
  assert.equal(current.fontSize, 15); assert.equal(current.lineHeight, 2.12); assert.equal(current.theme, "national");
  assert.deepEqual(current.versions, []);
});
