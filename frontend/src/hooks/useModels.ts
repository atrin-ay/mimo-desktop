import { useState, useEffect, useCallback } from 'react';
import {
  getModelCatalog,
  getCurrentModel,
  setCurrentModel,
  ModelCatalog,
  ProviderWithModels,
  ModelInfo,
} from '../api';

export interface UseModelsReturn {
  model: string;
  setModel: (model: string) => Promise<void>;
  catalog: ModelCatalog | null;
  providers: ProviderWithModels[];
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function formatError(err: any): string {
  const msg = err?.message || '';
  if (/provider_not_ready|not ready|starting|503/i.test(msg)) {
    return 'MiMo Code is still starting up — retry in a moment';
  }
  return msg || 'An error occurred';
}

export default function useModels(): UseModelsReturn {
  const [model, setModelState] = useState<string>('');
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cat, currentModelId] = await Promise.all([
        getModelCatalog(),
        getCurrentModel(),
      ]);
      setCatalog(cat);
      const defaultModel = currentModelId || cat?.providers?.[0]?.models?.[0]?.id || '';
      setModelState(defaultModel);
    } catch (err: any) {
      setError(formatError(err));
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setModel = useCallback(async (newModel: string) => {
    const previousModel = model;
    setModelState(newModel); // optimistic update
    try {
      setError(null);
      await setCurrentModel(newModel);
    } catch (err: any) {
      setModelState(previousModel); // revert on failure
      setError(err?.message || 'Failed to save model preference');
      throw err;
    }
  }, [model]);

  return {
    model,
    setModel,
    catalog,
    providers: catalog?.providers || [],
    models: catalog?.providers.flatMap((p) => p.models) || [],
    loading,
    error,
    refresh: loadData,
  };
}
