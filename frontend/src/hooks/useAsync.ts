import { useCallback, useEffect, useState } from "react";

/**
 * Хук для загрузки данных по запросу с флагами loading и error.
 * При смене run() перезапускает запрос.
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList
): { data: T | null; loading: boolean; error: Error | null; run: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    asyncFn()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, run };
}
