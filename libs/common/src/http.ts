export async function httpGet<T=any>(url: string, headers: Record<string,string> = {}): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return await res.json();
}
export async function httpPost<T=any>(url: string, body: any, headers: Record<string,string> = {}): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}`);
  return await res.json();
}
