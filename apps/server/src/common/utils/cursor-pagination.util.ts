import { CursorPaginationDto } from '../dto/cursor-pagination.dto';

export const DEFAULT_CURSOR_LIMIT = 20;
export const MAX_CURSOR_LIMIT = 100;

export type CursorPayload = Record<string, string | number | boolean | null>;

export type NormalizedCursorPagination = {
  cursor?: string;
  limit: number;
};

export type CursorPage<TItem> = {
  items: TItem[];
  next_cursor: string | null;
  has_more: boolean;
};

export function normalizeCursorPagination(dto: CursorPaginationDto): NormalizedCursorPagination {
  const rawLimit = dto.limit ?? DEFAULT_CURSOR_LIMIT;
  const limit = Math.min(Math.max(rawLimit, 1), MAX_CURSOR_LIMIT);

  return {
    cursor: dto.cursor,
    limit,
  };
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<TPayload extends CursorPayload>(cursor: string): TPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as TPayload;
  } catch {
    return null;
  }
}

export function buildCursorPage<TItem>(
  items: TItem[],
  limit: number,
  getCursor: (item: TItem) => string,
): CursorPage<TItem> {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = pageItems.at(-1);

  return {
    items: pageItems,
    next_cursor: hasMore && lastItem ? getCursor(lastItem) : null,
    has_more: hasMore,
  };
}
