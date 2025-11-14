// src/modules/bot/types/ml-service.types.ts

export interface MLPredictionRequest {
    text: string;
  }
  
  export interface MLPredictionResponse {
    name: string;
    description: string;
    priority: number; // 1-5
    deadline: string | null;
    execution_time: string;
    category: string[];
    difficulty: number; // 1-10
    stages: string[];
    status: string;
    confidence: number;
    processed_at: string;
  }
  
  export interface MLTrainingExample {
    text: string;
    labels: {
      name: string;
      description: string;
      priority: number;
      deadline: string | null;
      execution_time: string;
      category: string[];
      difficulty: number;
      stages: string[];
      status: string;
    };
  }
  
  export interface MLFineTuneRequest {
    training_examples: MLTrainingExample[];
    epochs?: number;
    batch_size?: number;
    learning_rate?: number;
    freeze_embedding?: boolean;
    model_version?: string;
  }
  
  export interface MLFineTuneResponse {
    training_id: string;
    status: string;
    message: string;
    model_name: string;
    total_examples: number;
    epochs: number;
    estimated_duration_seconds: number;
  }
  
  export interface MLBatchPredictionRequest {
    texts: string[];
  }
  
  export interface MLBatchPredictionResponse {
    results: MLPredictionResponse[];
    total: number;
    successful: number;
    failed: number;
  }
  