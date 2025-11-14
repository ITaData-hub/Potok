export interface TestQuestion {
    id: number;
    prompt: string;
    type: string;
    scale: Array<{
      value: number;
      emoji?: string;
      label: string;
    }>;
    weight: number;
  }
  
  export interface TestStructure {
    test_type: string;
    time_window: {
      start: string;
      end: string;
    };
    questions: TestQuestion[];
    estimated_duration: number;
  }
  