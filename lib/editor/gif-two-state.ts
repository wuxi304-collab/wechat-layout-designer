import { createStripedTransitionFrames, encodeIndexedGif, quantizeRgb332 } from "./gif-encoder";

export const twoStateSizes = {
  article: { width: 640, height: 360, label: "横版正文 · 640 × 360" },
  sticker: { width: 512, height: 512, label: "方形素材 · 512 × 512" },
  lenticular: { width: 480, height: 720, label: "竖版变画卡 · 480 × 720" },
} as const;

export type TwoStateSize = keyof typeof twoStateSizes;

function validateImage(image: ImageBitmap, width: number, height: number, name: string) {
  if (image.width <= 0 || image.height <= 0 || image.width * image.height > 16_000_000) {
    throw new Error(`${name} 像素尺寸无效或超过 1600 万像素安全上限。`);
  }
  const ratioDifference = Math.abs(image.width * height - image.height * width) / (image.height * width);
  if (ratioDifference > 0.01) {
    throw new Error(`${name} 的宽高比不符合当前画幅。为避免裁掉材料、标题或人物，请先在图片工具中重新构图，不会强行裁剪。`);
  }
}

function rasterize(image: ImageBitmap, width: number, height: number, title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("无法创建浏览器 Canvas，请检查浏览器兼容性。");
  context.fillStyle = "#102439";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  if (title.trim()) {
    const text = title.trim();
    const footerHeight = Math.max(54, Math.round(height * .1));
    let fontSize = Math.max(18, Math.min(28, Math.floor(width / 18)));
    context.textBaseline = "middle";
    context.textAlign = "center";
    do {
      context.font = `650 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      if (context.measureText(text).width <= width - 32) break;
      fontSize -= 1;
    } while (fontSize >= 14);
    if (context.measureText(text).width > width - 32) {
      throw new Error("固定标题过长，无法逐字排入画布。请缩短标题或改用更宽的画幅。");
    }
    context.fillStyle = "rgba(12, 30, 46, 0.92)";
    context.fillRect(0, height - footerHeight, width, footerHeight);
    context.fillStyle = "#ffffff";
    context.fillText(text, width / 2, height - footerHeight / 2, width - 32);
  }
  return quantizeRgb332(context.getImageData(0, 0, width, height).data);
}

export async function createLocalTwoStateGif(
  stateA: File,
  stateB: File,
  size: TwoStateSize,
  seconds: 4 | 6,
  title = "",
): Promise<Uint8Array> {
  const { width, height } = twoStateSizes[size];
  for (const [index, file] of [stateA, stateB].entries()) {
    if (file.size > 15 * 1024 * 1024) throw new Error(`状态 ${index ? "B" : "A"} 超过 15 MB，请先压缩图片。`);
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      throw new Error("只接受 PNG、JPEG、WebP 静态图片；SVG 和动态图片不在直接合成范围内。");
    }
  }
  const [bitmapA, bitmapB] = await Promise.all([createImageBitmap(stateA), createImageBitmap(stateB)]);
  try {
    validateImage(bitmapA, width, height, "状态 A");
    validateImage(bitmapB, width, height, "状态 B");
    const a = rasterize(bitmapA, width, height, title);
    const b = rasterize(bitmapB, width, height, title);
    const frames = createStripedTransitionFrames(a, b, width, height, seconds);
    return encodeIndexedGif(width, height, frames);
  } finally {
    bitmapA.close();
    bitmapB.close();
  }
}
