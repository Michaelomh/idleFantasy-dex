const base = import.meta.env.BASE_URL + 'game-data/';
const cache = new Map<string, Promise<unknown>>();

/** Fetches a JSON file under `public/game-data/`, caching the in-flight/resolved promise by path. */
export function loadJson<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(base + path).then((r) => r.json() as Promise<T>);
    cache.set(path, p);
  }
  return p;
}
