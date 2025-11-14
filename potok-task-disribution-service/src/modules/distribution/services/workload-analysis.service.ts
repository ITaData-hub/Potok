import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITask,
  IFutureForecasts,
} from '../../../common/interfaces/task.interface';
import { IWorkloadAnalysis } from '../../../common/interfaces/distribution.interface';
import { WorkloadLevel } from '../../../common/constants';
import { format } from 'date-fns';

@Injectable()
export class WorkloadAnalysisService {
  private readonly logger = new Logger(WorkloadAnalysisService.name);
  private readonly workloadConfig: any;

  constructor(private readonly configService: ConfigService) {
    const algorithmConfig = this.configService.get('algorithm');
    this.workloadConfig = algorithmConfig.workload;
  }

  /**
   * Анализ загрузки по дням
   */
  analyzeWorkload(
    scheduledTasks: ITask[],
    forecasts: IFutureForecasts,
    correlationId: string,
  ): IWorkloadAnalysis[] {
    this.logger.debug({
      message: 'Analyzing workload',
      correlationId,
    });

    const analysis: IWorkloadAnalysis[] = [];

    Object.entries(forecasts.workloadForecast).forEach(([dateStr, forecast]) => {
      const usedMinutes = forecast.scheduledMinutes;
      const availableMinutes = forecast.availableMinutes;
      const workloadPercentage = (usedMinutes / availableMinutes) * 100;

      const level = this.getWorkloadLevel(workloadPercentage);
      const isOverloaded =
        workloadPercentage > this.workloadConfig.overloadThreshold;

      analysis.push({
        date: dateStr,
        usedMinutes,
        availableMinutes,
        workloadPercentage: Math.round(workloadPercentage * 100) / 100,
        isOverloaded,
        level,
      });
    });

    // Сортируем по дате
    analysis.sort((a, b) => a.date.localeCompare(b.date));

    this.logger.debug({
      message: 'Workload analysis completed',
      daysAnalyzed: analysis.length,
      correlationId,
    });

    return analysis;
  }

  /**
   * Определение уровня загрузки
   */
  private getWorkloadLevel(workloadPercentage: number): WorkloadLevel {
    if (workloadPercentage < this.workloadConfig.underloadThreshold) {
      return WorkloadLevel.UNDERLOAD;
    } else if (workloadPercentage < this.workloadConfig.optimalMax) {
      return WorkloadLevel.OPTIMAL;
    } else if (workloadPercentage < this.workloadConfig.overloadThreshold) {
      return WorkloadLevel.LOADED;
    } else {
      return WorkloadLevel.OVERLOAD;
    }
  }

  /**
   * Получение статистики загрузки
   */
  getWorkloadStatistics(analysis: IWorkloadAnalysis[]): {
    avgWorkload: number;
    maxWorkload: number;
    minWorkload: number;
    overloadedDays: number;
    optimalDays: number;
  } {
    if (analysis.length === 0) {
      return {
        avgWorkload: 0,
        maxWorkload: 0,
        minWorkload: 0,
        overloadedDays: 0,
        optimalDays: 0,
      };
    }

    const workloads = analysis.map((a) => a.workloadPercentage);
    const avgWorkload =
      workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);

    const overloadedDays = analysis.filter((a) => a.isOverloaded).length;
    const optimalDays = analysis.filter(
      (a) => a.level === WorkloadLevel.OPTIMAL,
    ).length;

    return {
      avgWorkload: Math.round(avgWorkload * 100) / 100,
      maxWorkload: Math.round(maxWorkload * 100) / 100,
      minWorkload: Math.round(minWorkload * 100) / 100,
      overloadedDays,
      optimalDays,
    };
  }
}
