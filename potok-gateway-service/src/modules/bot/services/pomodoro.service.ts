import { Injectable, Logger } from '@nestjs/common';
import { AdminClientService } from 'src/modules/admin-client/admin-client.service';

export enum PomodoroPhase {
  WORK = 'WORK',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK',
}

export interface PomodoroSession {
  userId: string;
  maxUserId: string;
  currentPhase: PomodoroPhase;
  cycleCount: number;
  phaseStartedAt: string;
  phaseDuration: number;
  isPaused: boolean;
  pausedAt?: string;
  totalPausedTime: number;
}

@Injectable()
export class PomodoroService {
  private readonly logger = new Logger(PomodoroService.name);
  private readonly WORK_DURATION = 25 * 60;
  private readonly SHORT_BREAK = 5 * 60;
  private readonly LONG_BREAK = 15 * 60;

  constructor(private readonly adminClient: AdminClientService) {}

  async startSession(userId: string, maxUserId: string): Promise<PomodoroSession> {
    const session: PomodoroSession = {
      userId,
      maxUserId,
      currentPhase: PomodoroPhase.WORK,
      cycleCount: 0,
      phaseStartedAt: new Date().toISOString(),
      phaseDuration: this.WORK_DURATION,
      isPaused: false,
      totalPausedTime: 0,
    };

    await this.saveSession(maxUserId, session);
    this.logger.log(`Started Pomodoro for user ${maxUserId}`);
    return session;
  }

  async getSession(maxUserId: string): Promise<PomodoroSession | null> {
    const data = await this.adminClient.redisGet(`pomodoro:${maxUserId}`);
    return data ? JSON.parse(data) : null;
  }

  async pauseSession(maxUserId: string): Promise<PomodoroSession> {
    const session = await this.getSession(maxUserId);
    if (!session) throw new Error('No active session');
    if (session.isPaused) throw new Error('Already paused');

    session.isPaused = true;
    session.pausedAt = new Date().toISOString();
    await this.saveSession(maxUserId, session);
    return session;
  }

  async resumeSession(maxUserId: string): Promise<PomodoroSession> {
    const session = await this.getSession(maxUserId);
    if (!session) throw new Error('No active session');
    if (!session.isPaused) throw new Error('Not paused');

    const pausedDuration = Math.floor(
      (new Date().getTime() - new Date(session.pausedAt!).getTime()) / 1000
    );
    
    session.totalPausedTime += pausedDuration;
    session.isPaused = false;
    delete session.pausedAt;

    await this.saveSession(maxUserId, session);
    return session;
  }

  async completePhase(maxUserId: string): Promise<PomodoroSession> {
    const session = await this.getSession(maxUserId);
    if (!session) throw new Error('No session');

    if (session.currentPhase === PomodoroPhase.WORK) {
      session.cycleCount++;
      
      if (session.cycleCount % 4 === 0) {
        session.currentPhase = PomodoroPhase.LONG_BREAK;
        session.phaseDuration = this.LONG_BREAK;
      } else {
        session.currentPhase = PomodoroPhase.SHORT_BREAK;
        session.phaseDuration = this.SHORT_BREAK;
      }
    } else {
      session.currentPhase = PomodoroPhase.WORK;
      session.phaseDuration = this.WORK_DURATION;
    }

    session.phaseStartedAt = new Date().toISOString();
    session.totalPausedTime = 0;
    await this.saveSession(maxUserId, session);
    return session;
  }

  async stopSession(maxUserId: string): Promise<void> {
    await this.adminClient.redisDel(`pomodoro:${maxUserId}`);
  }

  async getProgress(maxUserId: string): Promise<number> {
    const session = await this.getSession(maxUserId);
    if (!session) return 0;

    const now = new Date().getTime();
    const start = new Date(session.phaseStartedAt).getTime();
    const elapsed = Math.floor((now - start) / 1000) - session.totalPausedTime;

    return Math.min(100, Math.floor((elapsed / session.phaseDuration) * 100));
  }

  async getRemainingTime(maxUserId: string): Promise<number> {
    const session = await this.getSession(maxUserId);
    if (!session) return 0;

    const now = new Date().getTime();
    const start = new Date(session.phaseStartedAt).getTime();
    const elapsed = Math.floor((now - start) / 1000) - session.totalPausedTime;

    return Math.max(0, session.phaseDuration - elapsed);
  }

  private async saveSession(maxUserId: string, session: PomodoroSession): Promise<void> {
    await this.adminClient.redisSet(
      `pomodoro:${maxUserId}`,
      JSON.stringify(session),
      7200
    );
  }
}
