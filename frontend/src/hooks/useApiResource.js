import { useCallback, useEffect, useState } from "react";
export function useApiResource(loader, deps, opts = {}) {
  const { enabled = true, initialData =  (null), mapError } = opts;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const reload = useCallback(async () => {
    if (!enabled) return null;
    setLoading(true);
    setError(null);
    try {
      const out = await loader();
      setData(out);
      return out;
    } catch (e) {
      setData(initialData);
      setError(mapError ? mapError(e) : (e instanceof Error ? e.message : "Ошибка загрузки"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, loader, initialData, mapError]);
  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    setLoading(true);
    setError(null);
    loader()
      .then((out) => {
        if (!cancelled) setData(out);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(initialData);
          setError(mapError ? mapError(e) : (e instanceof Error ? e.message : "Ошибка загрузки"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, deps);
  return { data, setData, loading, error, setError, reload };
}
