// Normalises entity read results across SDK versions.
//
// The SDK has returned three shapes in the versions this app has pinned:
//   - a plain array                       (filter(query), legacy positional args)
//   - { items, next_cursor, has_more }    (filter(query, { limit }) in newer SDKs)
//   - { data: [...] }                     (some older paged responses)
// Backend functions must handle all three, otherwise a query that works in the
// preview sandbox silently returns zero rows in production.

export function asRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

// Reads every page of a query. Falls back to the positional (query, sort, limit)
// form when the paged shape comes back empty — that form is an array on every
// SDK version this app has used.
export async function readAll(
  entity: any,
  query: any = {},
  options: { limit?: number; maxPages?: number; sort?: string } = {},
): Promise<any[]> {
  const { limit = 500, maxPages = 40, sort = '-created_date' } = options;
  const out: any[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const result = await entity.filter(query, { limit, ...(sort ? { sort } : {}), ...(cursor ? { cursor } : {}) });
    out.push(...asRows(result));
    cursor = !Array.isArray(result) && (result as any)?.has_more ? (result as any)?.next_cursor ?? null : null;
    if (!cursor) break;
  }

  if (out.length === 0) {
    const legacy = await entity.filter(query, sort, limit);
    const rows = asRows(legacy);
    if (rows.length > 0) {
      console.warn(`entityResults.readAll: paged shape returned nothing, positional form returned ${rows.length}`);
      out.push(...rows);
    }
  }

  return out;
}

// Exact row count. Some SDK versions expose count(), others do not — fall back to
// reading the rows so a dry run still reports real numbers.
export async function countRows(entity: any, query: any = {}): Promise<number> {
  if (typeof entity?.count === 'function') {
    try {
      const n = await entity.count(query);
      if (typeof n === 'number') return n;
    } catch {
      // fall through to a read
    }
  }
  const rows = await readAll(entity, query, { limit: 500, maxPages: 40 });
  return rows.length;
}