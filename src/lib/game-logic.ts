export const inr = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

export function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? "Something went wrong";
  return m;
}

export function countdown(iso: string, now: number) {
  const d = new Date(iso).getTime() - now;
  if (d <= 0) return "Started";
  const h = Math.floor(d / 3.6e6),
    m = Math.floor((d % 3.6e6) / 6e4),
    s = Math.floor((d % 6e4) / 1000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
