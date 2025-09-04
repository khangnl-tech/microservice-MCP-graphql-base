export async function listMcpTools(baseUrl: string) {
  const res = await fetch(new URL('/mcp/tools', baseUrl));
  if (!res.ok) throw new Error('MCP tools failed');
  return await res.json();
}
export async function callMcpTool<T=any>(baseUrl: string, tool: string, input: any): Promise<T> {
  const res = await fetch(new URL('/mcp/call', baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, input })
  });
  if (!res.ok) throw new Error(`MCP call ${tool} failed`);
  return await res.json() as T;
}
