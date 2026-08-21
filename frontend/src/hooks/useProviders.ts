import { useState, useEffect, useCallback } from 'react';
import { listProviders, setProviderCredential, removeProviderCredential, refreshModels, ProviderSummary } from '../api';

export interface UseProvidersReturn {
  providers: ProviderSummary[];
  loading: boolean;
  error: string | null;
  addCredential: (id: string, key: string) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  refreshing: boolean;
  refreshCatalog: () => Promise<void>;
}

export default function useProviders(): UseProvidersReturn {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listProviders();
      setProviders(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const addCredential = useCallback(async (id: string, key: string) => {
    try {
      setError(null);
      await setProviderCredential(id, key);
      await loadProviders();
    } catch (err: any) {
      setError(err?.message || 'Failed to save credential');
      throw err;
    }
  }, [loadProviders]);

  const removeCredential = useCallback(async (id: string) => {
    try {
      setError(null);
      await removeProviderCredential(id);
      await loadProviders();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove credential');
      throw err;
    }
  }, [loadProviders]);

  const refreshCatalog = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      await refreshModels();
      await loadProviders();
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh models');
    } finally {
      setRefreshing(false);
    }
  }, [loadProviders]);

  return {
    providers,
    loading,
    error,
    addCredential,
    removeCredential,
    refreshing,
    refreshCatalog,
  };
}
