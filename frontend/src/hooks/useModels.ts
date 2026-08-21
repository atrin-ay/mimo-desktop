import { useState, useEffect, useCallback } from 'react';
import {
  getModelCatalog,
  getCurrentModel,
  setCurrentModel,
  ModelCatalog,
  ProviderWithModels,
} from '../api';

export interface UseModelsReturn {
  model: string;
  setModel: (model: string) => Promise<void>;
  catalog: ModelCatalog | null;
  providers: ProviderWithModels[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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
      setModelState(currentModelId);
    } catch (err: any) {
      setError(err?.message || 'Failed to load models catalog');
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
    loading,
    error,
    refresh: loadData,
  };
}
