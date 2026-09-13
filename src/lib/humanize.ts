export function humanize(id: string | null | undefined): string {
  if (!id) return '';

  return id
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
