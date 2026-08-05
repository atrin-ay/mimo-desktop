import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useModels from '../useModels';

// ─── Mock API ──────────────────────────────────────────────────────────────

const mockListModels = vi.fn();
const mockGetCurrentModel = vi.fn();
const mockSetCurrentModel = vi.fn();

vi.mock('../../api', () => ({
  listModels: (...args: any[]) => mockListModels(...args),
  getCurrentModel: (...args: any[]) => mockGetCurrentModel(...args),
  setCurrentModel: (...args: any[]) => mockSetCurrentModel(...args),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads models and current model on mount', async () => {
    mockListModels.mockResolvedValue([
      { id: 'mimo/mimo-auto', name: 'Auto' },
      { id: 'xiaomi/mimo-v2.5', name: 'MiMo v2.5' },
    ]);
    mockGetCurrentModel.mockResolvedValue('mimo/mimo-auto');

    const { result } = renderHook(() => useModels());

    // Initially loading
    expect(result.current.modelsLoading).toBe(true);
    expect(result.current.model).toBe('mimo/mimo-auto');
    expect(result.current.models).toEqual([]);

    await waitFor(() => {
      expect(result.current.modelsLoading).toBe(false);
    });

    expect(result.current.models).toHaveLength(2);
    expect(result.current.model).toBe('mimo/mimo-auto');
    expect(result.current.modelsError).toBeNull();
  });

  it('falls back to default models on load failure', async () => {
    mockListModels.mockRejectedValue(new Error('Network error'));
    mockGetCurrentModel.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.modelsLoading).toBe(false);
    });

    // Should have default fallback models
    expect(result.current.models).toHaveLength(4);
    expect(result.current.models[0].id).toBe('mimo/mimo-auto');
    expect(result.current.modelsError).toBe('Network error');
  });

  it('setModel persists to backend and updates local state', async () => {
    mockListModels.mockResolvedValue([]);
    mockGetCurrentModel.mockResolvedValue('mimo/mimo-auto');
    mockSetCurrentModel.mockResolvedValue(undefined);

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.modelsLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setModel('xiaomi/mimo-v2.5');
    });

    expect(result.current.model).toBe('xiaomi/mimo-v2.5');
    expect(mockSetCurrentModel).toHaveBeenCalledWith('xiaomi/mimo-v2.5');
    expect(result.current.modelsError).toBeNull();
  });

  it('setModel keeps local state even when persistence fails', async () => {
    mockListModels.mockResolvedValue([]);
    mockGetCurrentModel.mockResolvedValue('mimo/mimo-auto');
    mockSetCurrentModel.mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.modelsLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setModel('xiaomi/mimo-v2.5');
    });

    // Local state updated despite backend failure
    expect(result.current.model).toBe('xiaomi/mimo-v2.5');
    expect(result.current.modelsError).toBe('Save failed');
  });
});
