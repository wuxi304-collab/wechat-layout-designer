type WechatStatus = {
  configured: boolean;
  connected: boolean;
  mode: string;
  appId: string | null;
  message: string;
};

let cachedProbe: { expiresAt: number; value: WechatStatus } | null = null;

function maskedAppId(value?: string) {
  if (!value) return null;
  if (value.length < 8) return "已配置";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function configuration(): WechatStatus {
  const bridgeUrl = process.env.WECHAT_BRIDGE_URL;
  const bridgeToken = process.env.WECHAT_BRIDGE_TOKEN;
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (bridgeUrl && bridgeToken) return { configured: true, connected: false, mode: "安全桥模式", appId: maskedAppId(appId), message: "凭据已存于服务端，等待连接检测" };
  if (appId && appSecret) return { configured: true, connected: false, mode: "服务端直连", appId: maskedAppId(appId), message: "AppID 与 AppSecret 已安全配置" };
  return { configured: false, connected: false, mode: "未配置", appId: null, message: "请在服务端环境中配置公众号凭据" };
}

async function probe(): Promise<WechatStatus> {
  if (cachedProbe && cachedProbe.expiresAt > Date.now()) return cachedProbe.value;
  const base = configuration();
  if (!base.configured) return base;
  try {
    let response: Response;
    if (process.env.WECHAT_BRIDGE_URL && process.env.WECHAT_BRIDGE_TOKEN) {
      response = await fetch(`${process.env.WECHAT_BRIDGE_URL.replace(/\/$/, "")}/health`, { headers: { authorization: `Bearer ${process.env.WECHAT_BRIDGE_TOKEN}` } });
    } else {
      response = await fetch("https://api.weixin.qq.com/cgi-bin/stable_token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credential", appid: process.env.WECHAT_APP_ID, secret: process.env.WECHAT_APP_SECRET, force_refresh: false }),
      });
    }
    const payload = await response.json() as { access_token?: string; errcode?: number; errmsg?: string; ok?: boolean };
    const connected = response.ok && (Boolean(payload.access_token) || payload.ok === true);
    const value = { ...base, connected, message: connected ? "接口凭证验证通过，可继续接入草稿箱" : `微信接口未通过：${payload.errmsg ?? payload.errcode ?? response.status}` };
    cachedProbe = { expiresAt: Date.now() + 60_000, value };
    return value;
  } catch {
    return { ...base, connected: false, message: "服务端无法连接微信接口，请检查白名单或桥接服务" };
  }
}

export async function GET(request: Request) {
  const wantsProbe = new URL(request.url).searchParams.get("probe") === "1";
  return Response.json(wantsProbe ? await probe() : configuration(), { headers: { "cache-control": "no-store" } });
}
