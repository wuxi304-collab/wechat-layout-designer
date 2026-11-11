export type GifInspection = {
  width: number;
  height: number;
  frameCount: number;
  durationMs: number;
  frameDurationsMs: number[];
  loopCount: number | null;
  hasTransparency: boolean;
  zeroDelayFrames: number;
  fileSizeBytes: number;
};

function fail(message: string): never {
  throw new Error(message);
}

function readByte(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset >= bytes.length) fail("GIF 文件结构不完整，无法继续读取。");
  return bytes[offset];
}

function readU16(bytes: Uint8Array, offset: number) {
  return readByte(bytes, offset) | (readByte(bytes, offset + 1) << 8);
}

function skipSubBlocks(bytes: Uint8Array, start: number, collect = false) {
  let offset = start;
  const chunks: Uint8Array[] = [];
  for (let count = 0; count < 100_000; count += 1) {
    const size = readByte(bytes, offset++);
    if (size === 0) return { offset, chunks };
    if (offset + size > bytes.length) fail("GIF 数据块被截断，文件可能不完整。");
    if (collect) chunks.push(bytes.slice(offset, offset + size));
    offset += size;
  }
  return fail("GIF 数据块数量异常，已停止解析。");
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

/**
 * Reads the GIF container only. It does not decode pixels or claim visual quality.
 * This is deliberately dependency-free so the browser can preflight a local file.
 */
export function inspectGifBuffer(input: ArrayBuffer | Uint8Array, fileSizeBytes?: number): GifInspection {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 14) fail("文件太小，不是完整 GIF。");
  const signature = ascii(bytes, 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") fail("文件头不是 GIF87a / GIF89a，不能按 GIF 处理。");

  const width = readU16(bytes, 6);
  const height = readU16(bytes, 8);
  if (!width || !height) fail("GIF 画布宽高无效。");

  const screenPacked = readByte(bytes, 10);
  let offset = 13;
  if (screenPacked & 0x80) offset += 3 * (1 << ((screenPacked & 0x07) + 1));
  if (offset > bytes.length) fail("GIF 全局颜色表不完整。");

  let frameCount = 0;
  let durationMs = 0;
  let pendingDelayMs = 100;
  let loopCount: number | null = null;
  let hasTransparency = false;
  let zeroDelayFrames = 0;
  const frameDurationsMs: number[] = [];
  let trailerFound = false;

  while (offset < bytes.length) {
    const marker = readByte(bytes, offset++);
    if (marker === 0x3b) {
      trailerFound = true;
      break;
    }

    if (marker === 0x21) {
      const label = readByte(bytes, offset++);
      if (label === 0xf9) {
        const blockSize = readByte(bytes, offset++);
        if (blockSize < 4 || offset + blockSize >= bytes.length) fail("GIF 图形控制扩展不完整。");
        const control = readByte(bytes, offset);
        const delayHundredths = readU16(bytes, offset + 1);
        hasTransparency ||= Boolean(control & 0x01);
        if (delayHundredths === 0) zeroDelayFrames += 1;
        pendingDelayMs = delayHundredths ? delayHundredths * 10 : 100;
        offset += blockSize;
        if (readByte(bytes, offset) !== 0) fail("GIF 图形控制扩展缺少结束标记。");
        offset += 1;
        continue;
      }

      if (label === 0xff) {
        const blockSize = readByte(bytes, offset++);
        if (offset + blockSize > bytes.length) fail("GIF 应用扩展不完整。");
        const appId = ascii(bytes, offset, blockSize);
        offset += blockSize;
        const data = skipSubBlocks(bytes, offset, true);
        offset = data.offset;
        if ((appId.startsWith("NETSCAPE2.0") || appId.startsWith("ANIMEXTS1.0")) && data.chunks[0]?.length >= 3 && data.chunks[0][0] === 1) {
          loopCount = data.chunks[0][1] | (data.chunks[0][2] << 8);
        }
        continue;
      }

      offset = skipSubBlocks(bytes, offset).offset;
      continue;
    }

    if (marker === 0x2c) {
      if (offset + 9 > bytes.length) fail("GIF 图像描述符不完整。");
      const frameWidth = readU16(bytes, offset + 4);
      const frameHeight = readU16(bytes, offset + 6);
      const imagePacked = readByte(bytes, offset + 8);
      if (!frameWidth || !frameHeight) fail("GIF 中存在宽高为零的图像帧。");
      offset += 9;
      if (imagePacked & 0x80) offset += 3 * (1 << ((imagePacked & 0x07) + 1));
      if (offset >= bytes.length) fail("GIF 缺少 LZW 图像数据。");
      offset += 1;
      offset = skipSubBlocks(bytes, offset).offset;

      frameCount += 1;
      if (frameCount > 10_000) fail("GIF 帧数超过本地预检安全上限（10000 帧）。");
      frameDurationsMs.push(pendingDelayMs);
      durationMs += pendingDelayMs;
      pendingDelayMs = 100;
      continue;
    }

    fail(`GIF 出现未知数据块标记 0x${marker.toString(16)}，文件可能已损坏。`);
  }

  if (!trailerFound) fail("GIF 缺少文件结束标记，文件可能未完整下载。");
  if (!frameCount) fail("GIF 中没有可识别的图像帧。");

  return {
    width, height, frameCount, durationMs, frameDurationsMs, loopCount,
    hasTransparency, zeroDelayFrames,
    fileSizeBytes: fileSizeBytes ?? bytes.byteLength,
  };
}

export async function inspectGifFile(file: Pick<File, "arrayBuffer" | "size">) {
  return inspectGifBuffer(await file.arrayBuffer(), file.size);
}
