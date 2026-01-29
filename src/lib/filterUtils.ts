export function fastFilter(items: any[], query: string, keys: string[]): any[] {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    keys.some(key =>
      (item[key] || '').toString().toLowerCase().includes(lowerQuery)
    )
  );
} 