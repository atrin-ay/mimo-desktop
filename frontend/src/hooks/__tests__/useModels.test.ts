import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useModels from '../useModels';

// ─── Mock API ──────────────────────────────────────────────────────────────

const mockGetModelCatalog = vi.fn();
const mockGetCurrentModel = vi.fn();
const mockSetCurrentModel = vi.fn();

vi.mock('../../api', () => ({
  getModelCatalog: (...args: any[]) => mockGetModelCatalog(...args),
  getCurrentModel: (...args: any[]) => mockGetCurrentModel(...args),
  setCurrentModel: (...args: any[]) => mockSetCurrentModel(...args),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads catalog and current model on mount', async () => {
    mockGetModelCatalog.mockResolvedValue({
      providers: [
        {
          id: 'xiaomi',
          name: 'Xiaomi',
          env: [],
          options: {},
          source: 'config',
          hasCredential: true,
          models: [
            { id: 'xiaomi/mimo-v2.5', providerID: 'xiaomi', modelID: 'mimo-v2.5', name: 'MiMo v2.5' },
          ],
        },
      ],
      default: { xiaomi: 'mimo-v2.5' },
      fetchedAt: Date.now(),
    });
    mockGetCurrentModel.mockResolvedValue('xiaomi/mimo-v2.5');

    const { result } = renderHook(() => useModels());

    expect(result.current.loading).toBe(true);
    expect(result.current.model).toBe('');
    expect(result.current.providers).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.providers).toHaveLength(1);
    expect(result.current.model).toBe('xiaomi/mimo-v2.5');
    expect(result.current.error).toBeNull();
  });

  it('sets error state on load failure without fallback list', async () => {
    mockGetModelCatalog.mockRejectedValue(new Error('Provider not ready'));
    mockGetCurrentModel.mockRejectedValue(new Error('Provider not ready'));

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.providers).toHaveLength(0);
    expect(result.current.error).toBe('Provider not ready');
  });

  it('setModel persists to backend and updates local state', async () => {
    mockGetModelCatalog.mockResolvedValue({
      providers: [],
      default: {},
      fetchedAt: Date.now(),
    });
    mockGetCurrentModel.mockResolvedValue('xiaomi/mimo-v2.5');
    mockSetCurrentModel.mockResolvedValue(undefined);

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.setModel('xiaomi/mimo-v2.5-pro');
    });

    expect(result.current.model).toBe('xiaomi/mimo-v2.5-pro');
    expect(mockSetCurrentModel).toHaveBeenCalledWith('xiaomi/mimo-v2.5-pro');
    expect(result.current.error).toBeNull();
  });

  it('setModel reverts local state when persistence fails', async () => {
    mockGetModelCatalog.mockResolvedValue({
      providers: [],
      default: {},
      fetchedAt: Date.now(),
    });
    mockGetCurrentModel.mockResolvedValue('xiaomi/mimo-v2.5');
    mockSetCurrentModel.mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.setModel('xiaomi/mimo-v2.5-pro');
      } catch {}
    });

    // Reverts on failure
    expect(result.current.model).toBe('xiaomi/mimo-v2.5');
    expect(result.current.error).toBe('Save failed');
  });
});
