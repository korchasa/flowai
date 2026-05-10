export async function fetchWithClient(url: string): Promise<Response> {
  return await fetch(url);
}
