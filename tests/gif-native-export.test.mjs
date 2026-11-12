import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectGifBuffer } from "../lib/editor/gif-inspector.ts";
import { createStripedTransitionFrames, encodeIndexedGif, quantizeRgb332 } from "../lib/editor/gif-encoder.ts";

/** Independent GIF/LZW reader: verify actual decodability, not only container headers. */
function decodeIndexedGif(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let pos = 13 + 3 * (1 << ((bytes[10] & 7) + 1));
  const images = [];
  const skipSubBlocks = () => {
    while (true) {
      const size = bytes[pos++];
      if (!size) break;
      pos += size;
    }
  };
  while (pos < bytes.length) {
    const marker = bytes[pos++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      pos += 1; // extension type
      const blockSize = bytes[pos++];
      pos += blockSize;
      skipSubBlocks();
      continue;
    }
    assert.equal(marker, 0x2c, "image descriptor");
    const imagePacked = bytes[pos + 8];
    pos += 9;
    if (imagePacked & 0x80) pos += 3 * (1 << ((imagePacked & 7) + 1));
    const minimumCodeSize = bytes[pos++];
    const compressed = [];
    while (true) {
      const length = bytes[pos++];
      if (!length) break;
      for (let i = 0; i < length; i++) compressed.push(bytes[pos + i]);
      pos += length;
    }
    const data = Uint8Array.from(compressed);
    const clear = 1 << minimumCodeSize;
    const end = clear + 1;
    let dictionary, nextCode, codeWidth, prior, bitPosition = 0;
    function reset() {
      dictionary = Array.from({ length: clear }, (_, index) => [index]);
      dictionary[clear] = null;
      dictionary[end] = null;
      nextCode = end + 1;
      codeWidth = minimumCodeSize + 1;
      prior = null;
    }
    function readCode() {
      let result = 0;
      for (let bit = 0; bit < codeWidth; bit++) {
        const absolute = bitPosition + bit;
        result |= ((data[absolute >>> 3] >>> (absolute & 7)) & 1) << bit;
      }
      bitPosition += codeWidth;
      return result;
    }
    reset();
    const output = [];
    while (bitPosition < data.length * 8) {
      const code = readCode();
      if (code === clear) { reset(); continue; }
      if (code === end) break;
      let entry = dictionary[code];
      if (!entry && code === nextCode && prior) entry = [...prior, prior[0]];
      assert.ok(entry, `LZW code ${code} must be decodable`);
      output.push(...entry);
      if (prior) {
        dictionary[nextCode++] = [...prior, entry[0]];
        if (nextCode === (1 << codeWidth) && codeWidth < 12) codeWidth += 1;
      }
      prior = entry;
    }
    images.push(Uint8Array.from(output));
  }
  return images;
}

test("RGB332 indexing has stable shared palette for identical material colors", () => {
  const bytes = Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
  assert.deepEqual([...quantizeRgb332(bytes)], [224, 28, 3]);
  assert.throws(() => quantizeRgb332(Uint8Array.of(10, 20, 30)), /4 的整数倍/);
});

test("dual-state render produces a real decodable 4-second loop with A→B→A", () => {
  const width = 80, height = 64;
  const a = new Uint8Array(width * height).fill(20);
  const b = new Uint8Array(width * height).fill(180);
  const frames = createStripedTransitionFrames(a, b, width, height, 4);
  assert.equal(frames.length, 17);
  assert.equal(frames.reduce((sum, item) => sum + item.delayCentiseconds, 0), 400);
  assert.ok(frames.every((frame) => frame.delayCentiseconds >= 2));
  const gif = encodeIndexedGif(width, height, frames);
  const info = inspectGifBuffer(gif);
  assert.equal(info.width, width);
  assert.equal(info.height, height);
  assert.equal(info.frameCount, 17);
  assert.equal(info.durationMs, 4000);
  assert.equal(info.loopCount, 0);
  assert.equal(info.zeroDelayFrames, 0);
  const decoded = decodeIndexedGif(gif);
  assert.equal(decoded.length, 17);
  assert.deepEqual(decoded[0], a);
  assert.deepEqual(decoded[8], b);
  assert.deepEqual(decoded[16], a);
  assert.notDeepEqual(decoded[4], a);
  assert.notDeepEqual(decoded[4], b);
});

test("LZW handles dictionary width growth and repetitive industrial pattern", () => {
  const width = 240, height = 140;
  const a = Uint8Array.from({ length: width * height }, (_, i) => (i * 17 + (i >>> 7) * 11) & 255);
  const b = Uint8Array.from({ length: width * height }, (_, i) => (255 - i * 9 - (i >>> 4) * 3) & 255);
  const frames = createStripedTransitionFrames(a, b, width, height, 6);
  const gif = encodeIndexedGif(width, height, frames);
  const info = inspectGifBuffer(gif);
  assert.equal(info.durationMs, 6000);
  const decoded = decodeIndexedGif(gif);
  assert.deepEqual(decoded[0], a);
  assert.deepEqual(decoded[8], b);
  assert.deepEqual(decoded[16], a);
});

test("invalid input is rejected rather than exporting a silently broken GIF", () => {
  assert.throws(() => createStripedTransitionFrames(Uint8Array.of(1), Uint8Array.of(1), 1, 1, 4), /没有可见差异/);
  assert.throws(() => encodeIndexedGif(0, 3, [{ pixels: Uint8Array.of(1), delayCentiseconds: 20 }]), /画幅/);
  assert.throws(() => encodeIndexedGif(3, 3, [{ pixels: Uint8Array.of(1), delayCentiseconds: 20 }]), /像素数量/);
  assert.throws(() => encodeIndexedGif(1, 1, [{ pixels: Uint8Array.of(1), delayCentiseconds: 0 }]), /单帧延时/);
});

test("the real browser export is integrated in the existing GIF tab with no new workflow stage", async () => {
  const [app, page, doc] = await Promise.all([
    readFile(new URL("../app/gif-workbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../GIF-WORKBENCH.md", import.meta.url), "utf8"),
  ]);
  assert.match(app, /createLocalTwoStateGif\(stateA, stateB, nativeSize, nativeSeconds, nativeTitle\)/);
  assert.match(app, /generate|生成双状态 GIF/);
  assert.match(app, /download=\{nativeArtifact\.name\}/);
  assert.match(app, /await chooseFile\(output\)/);
  assert.match(app, /只接受|image\/png,image\/jpeg,image\/webp/);
  assert.match(page, /type StageKey = "稿件" \| "编排" \| "版式" \| "封面" \| "交付"/);
  assert.match(doc, /双图变画/);
});
