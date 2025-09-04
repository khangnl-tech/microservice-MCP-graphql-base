export async function gqlRequest<T=any>(endpoint: string, query: string, variables: Record<string, any> = {}, headers: Record<string,string> = {}): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));
  }
  return json.data as T;
}
