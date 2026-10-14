/**
 * Databáze rezervací v Supabase (supabase/schema.sql). Web volá jen její
 * funkce, a to přes REST se servisním klíčem — proto tenhle soubor smí
 * běžet jen na serveru.
 */
export interface Pripojeni {
  url: string;
  klic: string;
}

/** Funkce v databázi řekla ne (raise exception) — `kod` je její hláška, třeba „plno“ */
export class ChybaDb extends Error {
  constructor(
    public kod: string,
    public stav: number,
  ) {
    super(kod);
  }
}

export async function rpc<T>(p: Pripojeni, funkce: string, parametry: Record<string, unknown>): Promise<T> {
  const hlavicky: Record<string, string> = { "Content-Type": "application/json", apikey: p.klic };
  /* Nové klíče (sb_secret_…) se posílají jen jako apikey; starý service_role je JWT a patří i do Authorization */
  if (!p.klic.startsWith("sb_")) hlavicky.Authorization = `Bearer ${p.klic}`;
  const r = await fetch(`${p.url.replace(/\/+$/, "")}/rest/v1/rpc/${funkce}`, {
    method: "POST",
    headers: hlavicky,
    body: JSON.stringify(parametry),
  });
  if (!r.ok) {
    const telo = (await r.json().catch(() => null)) as { message?: string } | null;
    throw new ChybaDb(telo?.message ?? "chyba", r.status);
  }
  if (r.status === 204) return null as T;
  return (await r.json()) as T;
}
