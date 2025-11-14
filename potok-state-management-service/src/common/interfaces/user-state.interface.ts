import { UIMode } from '../enums/ui-mode.enum';

export interface UserState {
  user_id: string;
  timestamp: Date;
  state: {
    energy: number;
    focus: number;
    motivation: number;
    stress: number;
  };
  trends: {
    energy_trend: number;
    focus_trend: number;
    motivation_trend: number;
    stress_trend: number;
  };
  circadian_factor: number;
  day_of_week_factor: number;
  ui_mode: UIMode;
  last_test_times: {
    energy?: Date;
    focus?: Date;
    motivation?: Date;
    stress?: Date;
  };
  next_test_due?: {
    test_type: string;
    due_at: Date;
  };
}
