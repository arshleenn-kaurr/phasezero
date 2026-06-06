import { useEffect, useState } from "react";

import {
  fetchAgentActivity,
  fetchCandidateDetail,
  fetchCandidates,
  type AgentActivity,
  type CandidateDetail,
  type CandidateSummary,
} from "./api";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    loader(controller.signal)
      .then((result) => setData(result))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(true);
        setData(null);
        if (!(err instanceof DOMException)) {
          console.error(err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useCandidates(): AsyncState<CandidateSummary[]> {
  return useAsync((signal) => fetchCandidates(signal), []);
}

const DEFAULT_CANDIDATE_ID = "tf-adc";

export function useCandidateDetail(id: string | undefined): AsyncState<CandidateDetail> {
  return useAsync(
    (signal) => fetchCandidateDetail(id ?? DEFAULT_CANDIDATE_ID, signal),
    [id],
  );
}

export function useAgentActivity(): AsyncState<AgentActivity> {
  return useAsync((signal) => fetchAgentActivity(signal), []);
}

// Combines the candidate list with a selection and the selected detail.
// Used by the Evidence, Simulation, and Memos views.
export function useSelectedCandidate() {
  const candidates = useCandidates();
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_CANDIDATE_ID);

  useEffect(() => {
    if (
      candidates.data &&
      candidates.data.length > 0 &&
      !candidates.data.find((c) => c.id === selectedId)
    ) {
      setSelectedId(candidates.data[0].id);
    }
  }, [candidates.data, selectedId]);

  const detail = useCandidateDetail(selectedId);

  return {
    candidates: candidates.data,
    candidatesLoading: candidates.loading,
    candidatesError: candidates.error,
    selectedId,
    setSelectedId,
    detail: detail.data,
    detailLoading: detail.loading,
    detailError: detail.error,
  };
}
