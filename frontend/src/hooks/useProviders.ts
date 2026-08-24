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

function formatError(err: any): string {
  const msg = err?.message || '';
  if (/provider_not_ready|not ready|starting|503/i.test(msg)) {
    return 'MiMo Code is still starting up — retry in a moment';
  }
  return msg || 'An error occurred';
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
      setError(formatError(err));
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
      setError(formatError(err));
      throw err;
    }
  }, [loadProviders]);

  const removeCredential = useCallback(async (id: string) => {
    try {
      setError(null);
      await removeProviderCredential(id);
      await loadProviders();
    } catch (err: any) {
      setError(formatError(err));
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
      setError(formatError(err));
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
