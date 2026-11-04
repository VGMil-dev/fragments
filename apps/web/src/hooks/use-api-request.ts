import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "@fragments/contracts";
import type { AsyncState } from "./async-state";

export type EmptyCheck<T> = (data: T) => boolean;

export function toAsyncState<T>(
  result: ApiResult<T>,
  retry: () => void,
  isEmpty: EmptyCheck<T> = (data) => Array.isArray(data) && data.length === 0,
): AsyncState<T> {
  if (!result.ok) return { status: "error", retry };
  if (isEmpty(result.data)) return { status: "empty" };
  return { status: "success", data: result.data };
}

export interface UseApiRequestOptions<T> {
  requestKey: string;
  request: (signal: AbortSignal) => Promise<ApiResult<T>>;
  isEmpty?: EmptyCheck<T>;
}

/** Callers change requestKey when the request inputs change; retries keep the same key. */
export function useApiRequest<T>({ requestKey, request, isEmpty }: UseApiRequestOptions<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef(request);
  const emptyCheckRef = useRef(isEmpty);
  requestRef.current = request;
  emptyCheckRef.current = isEmpty;

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ status: "loading" });

    requestRef.current(controller.signal)
      .then((result) => {
        if (active) setState(toAsyncState(result, retry, emptyCheckRef.current));
      })
      .catch(() => {
        if (active) setState({ status: "error", retry });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey, attempt, retry]);

  return state;
}
