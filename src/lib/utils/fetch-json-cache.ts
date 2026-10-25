const base = import.meta.env.BASE_URL + 'game-data/';
const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(base + path).then((r) => r.json() as Promise<T>);
    cache.set(path, p);
  }
  return p;
}
