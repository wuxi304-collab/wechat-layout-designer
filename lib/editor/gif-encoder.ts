/** Opaque GIF89a encoding for two-state editorial animations.
 * Uses a shared, deterministic RGB332 palette, no third-party binaries and
 * no uploaded source assets. Complex artwork may show 256-color banding.
 */
export type IndexedGifFrame = { pixels: Uint8Array; delayCentiseconds: number };

const PALETTE_SIZE = 256;
const LZW_CLEAR = 256;
const LZW_END = 257;

export function quantizeRgb332(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  if (rgba.length % 4 !== 0) throw new Error("RGBA 数据长度必须是 4 的整数倍。");
  const result = new Uint8Array(rgba.length / 4);
  for (let p = 0, i = 0; p < rgba.length; p += 4, i++) {
    // Alpha is composited onto an opaque canvas by the calling renderer.
    result[i] = ((rgba[p] >>> 5) << 5) | ((rgba[p + 1] >>> 5) << 2) | (rgba[p + 2] >>> 6);
  }
  return result;
}

function writeLzwPixels(indices: Uint8Array): Uint8Array {
  if (!indices.length) throw new Error("GIF 图像帧不能为空。");
  let dictionary = new Map<number, number>();
  let nextCode = LZW_END + 1;
  let codeWidth = 9;
  let bitBuffer = 0;
  let pendingBits = 0;
  const bytes: number[] = [];
  function putCode(value: number) {
    bitBuffer |= value << pendingBits;
    pendingBits += codeWidth;
    while (pendingBits >= 8) {
      bytes.push(bitBuffer & 255);
      bitBuffer >>>= 8;
      pendingBits -= 8;
    }
  }
  function clearDictionary() {
    dictionary = new Map();
    nextCode = LZW_END + 1;
    codeWidth = 9;
  }
  putCode(LZW_CLEAR);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const color = indices[i];
    const key = prefix * PALETTE_SIZE + color;
    const known = dictionary.get(key);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    putCode(prefix);
    if (nextCode < 4096) {
      dictionary.set(key, nextCode++);
      // Decoder creates a dictionary entry one code behind the encoder.
      if (nextCode > (1 << codeWidth) && codeWidth < 12) codeWidth++;
    } else {
      putCode(LZW_CLEAR);
      clearDictionary();
    }
    prefix = color;
  }
  putCode(prefix);
  putCode(LZW_END);
  if (pendingBits) bytes.push(bitBuffer & 255);
  return Uint8Array.from(bytes);
}

export function encodeIndexedGif(width: number, height: number, frames: readonly IndexedGifFrame[]): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1024 || height > 1024) {
    throw new Error("本地动图画幅必须在 1—1024 px 之间。");
  }
  if (!frames.length || frames.length > 80) throw new Error("动图帧数必须在 1—80 帧之间。");
  const bytes: number[] = [];
  const push = (...values: number[]) => { bytes.push(...values); };
  const u16 = (value: number) => push(value & 255, value >>> 8 & 255);
  push(71, 73, 70, 56, 57, 97); // GIF89a
  u16(width); u16(height);
  push(0xf7, 0, 0); // global RGB332 palette, 256 colors
  for (let color = 0; color < 256; color++) {
    push(Math.round((color >>> 5) * 255 / 7), Math.round(((color >>> 2) & 7) * 255 / 7), (color & 3) * 85);
  }
  // NETSCAPE2.0, 0 loops = infinite animation.
  push(0x21, 0xff, 0x0b, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0);
  for (const frame of frames) {
    if (frame.pixels.length !== width * height) throw new Error("GIF 图像帧像素数量与画布不匹配。");
    const delay = frame.delayCentiseconds;
    if (!Number.isInteger(delay) || delay < 2 || delay > 65535) {
      throw new Error("GIF 单帧延时必须是 2—65535 厘秒。");
    }
    push(0x21, 0xf9, 4, 8); // opaque, full frames, restore to background
    u16(delay); push(0, 0);
    push(0x2c, 0, 0, 0, 0);
    u16(width); u16(height);
    push(0, 8); // no local palette, 8-bit LZW minimum code size
    const compressed = writeLzwPixels(frame.pixels);
    for (let i = 0; i < compressed.length; i += 255) {
      const block = compressed.subarray(i, i + 255);
      push(block.length, ...block);
    }
    push(0); // end of image sub-blocks
  }
  push(0x3b);
  return Uint8Array.from(bytes);
}

/** A hold → vertical stripe reveal → B hold → reverse reveal → A hold. */
export function createStripedTransitionFrames(a: Uint8Array, b: Uint8Array, width: number, height: number, seconds: 4 | 6): IndexedGifFrame[] {
  if (a.length !== width * height || b.length !== a.length) throw new Error("两张图的画布像素不一致。");
  if (a.every((value, index) => value === b[index])) throw new Error("两张图片的色彩在 GIF 256 色量化后没有可见差异，请更换素材。");
  const total = seconds * 100;
  const holdA = Math.round(total * .25);
  const holdB = Math.round(total * .3);
  const holdEnd = Math.round(total * .15);
  const transit1 = Math.floor((total - holdA - holdB - holdEnd) / 2);
  const transit2 = total - holdA - holdB - holdEnd - transit1;
  const steps = 8;
  const frames: IndexedGifFrame[] = [{ pixels: a, delayCentiseconds: holdA }];
  const thresholds = new Float32Array(width);
  for (let x = 0; x < width; x++) thresholds[x] = ((x % 12) / 12) * .78 + (x / width) * .22;
  function makeState(progress: number) {
    const output = new Uint8Array(a.length);
    const chooseB = Array.from(thresholds, (threshold) => progress > threshold);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const pos = row + x;
        output[pos] = chooseB[x] ? b[pos] : a[pos];
      }
    }
    return output;
  }
  const delays = (value: number) => Array.from({ length: steps }, (_, index) => Math.floor(value / steps) + (index < value % steps ? 1 : 0));
  const forward = delays(transit1);
  const backward = delays(transit2);
  for (let step = 1; step < steps; step++) frames.push({ pixels: makeState(step / steps), delayCentiseconds: forward[step - 1] });
  frames.push({ pixels: b, delayCentiseconds: holdB + forward[steps - 1] });
  for (let step = 1; step < steps; step++) frames.push({ pixels: makeState(1 - step / steps), delayCentiseconds: backward[step - 1] });
  frames.push({ pixels: a, delayCentiseconds: holdEnd + backward[steps - 1] });
  return frames;
}
