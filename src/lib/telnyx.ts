const TELNYX_API = "https://api.telnyx.com/v2";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function telnyxFetch(path: string, init?: RequestInit) {
  const apiKey = requireEnv("TELNYX_API_KEY");
  const res = await fetch(`${TELNYX_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      typeof body === "object" && body && "errors" in body
        ? JSON.stringify((body as { errors: unknown }).errors)
        : text || res.statusText;
    throw new Error(`Telnyx API error (${res.status}): ${message}`);
  }

  return body as { data?: Record<string, unknown> };
}

export type SendFaxParams = {
  from: string;
  to: string;
  mediaUrl: string;
};

export async function sendFax({ from, to, mediaUrl }: SendFaxParams) {
  const connectionId = requireEnv("TELNYX_FAX_CONNECTION_ID");
  const result = await telnyxFetch("/faxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connection_id: connectionId,
      from,
      to,
      media_url: mediaUrl,
      store_media: true,
    }),
  });

  const data = result.data ?? {};
  return {
    id: String(data.id ?? ""),
    status: String(data.status ?? "queued"),
  };
}

export async function downloadMedia(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download media (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Verify Telnyx webhook signature when TELNYX_PUBLIC_KEY is set. */
export async function verifyTelnyxWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  const publicKey = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKey) {
    // Dev mode: allow unsigned webhooks when key is not configured
    return true;
  }

  if (!signature || !timestamp) {
    return false;
  }

  try {
    const { createVerify } = await import("crypto");
    const signedPayload = `${timestamp}|${rawBody}`;
    const verifier = createVerify("SHA256");
    verifier.update(signedPayload);
    verifier.end();
    return verifier.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

export function normalizeE164(input: string): string {
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("357")) return `+${digits}`;
  return `+${digits}`;
}
