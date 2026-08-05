import { useState, useEffect, useCallback } from "react";
import {
  listModels,
  getCurrentModel,
  setCurrentModel,
  ModelInfo,
} from "../api";

const DEFAULT_MODELS: ModelInfo[] = [
  { id: 'mimo/mimo-auto', name: 'Auto', description: 'Automatically select the best model' },
  { id: 'xiaomi/mimo-v2.5', name: 'MiMo v2.5', description: 'Standard MiMo v2.5 model' },
  { id: 'xiaomi/mimo-v2.5-pro', name: 'MiMo v2.5 Pro', description: 'Advanced MiMo v2.5 Pro model' },
  { id: 'xiaomi/mimo-v2.5-pro-ultraspeed', name: 'MiMo v2.5 Pro UltraSpeed', description: 'Ultra-fast MiMo v2.5 Pro model' },
];

export interface UseModelsReturn {
  model: string;
  setModel: (model: string) => void;
  models: ModelInfo[];
  modelsLoading: boolean;
  modelsError: string | null;
}

export default function useModels(): UseModelsReturn {
  const [model, setModelState] = useState<string>('mimo/mimo-auto');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // --- Load models on mount ---
  useEffect(() => {
    const loadModels = async () => {
      try {
        const [modelsList, currentModelId] = await Promise.all([
          listModels(),
          getCurrentModel(),
        ]);
        setModels(modelsList);
        setModelState(currentModelId);
      } catch (err: any) {
        // Fallback to default models
        setModels(DEFAULT_MODELS);
        setModelsError(err?.message || 'Failed to load models');
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
  }, []);

  // --- Model setter that also persists to backend ---
  const setModel = useCallback(async (newModel: string) => {
    setModelState(newModel);
    try {
      await setCurrentModel(newModel);
    } catch (err: any) {
      setModelsError(err?.message || 'Failed to save model preference');
    }
  }, []);

  return { model, setModel, models, modelsLoading, modelsError };
}
