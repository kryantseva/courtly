import { useMemo, useState } from "react";
export function useOffsetPagination(initialLimit = 10) {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);
  const [meta, setMeta] = useState( (null));
  const controls = useMemo(() => ({
    canPrev: Boolean(meta?.previous),
    canNext: Boolean(meta?.next),
    prev: () => setOffset((v) => Math.max(0, v - (meta?.limit || limit))),
    next: () => setOffset((v) => v + (meta?.limit || limit)),
    reset: () => setOffset(0),
  }), [limit, meta]);
  const total = meta?.total ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { offset, limit, meta, setMeta, setOffset, controls, total, currentPage, totalPages };
}
