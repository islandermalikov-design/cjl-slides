export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function sp(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = params[key];
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

export function spAll(params: Record<string, string | string[] | undefined>, key: string): string[] {
  const v = params[key];
  if (!v) return [];
  return (Array.isArray(v) ? v : v.split(",")).filter(Boolean);
}
