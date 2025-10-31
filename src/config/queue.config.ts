import { BullRootModuleOptions } from '@nestjs/bullmq/dist/interfaces/shared-bull-config.interface';
import { SECONDS_IN_DAY } from '../constants/system';

export const queueConfig = (): BullRootModuleOptions => ({
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      delay: 1000,
      type: 'exponential',
    },
    removeOnComplete: {
      age: parseInt(process.env.BULL_TASKS_TTL_DAYS) * SECONDS_IN_DAY,
    },
    removeOnFail: {
      age: parseInt(process.env.BULL_TASKS_TTL_DAYS) * SECONDS_IN_DAY,
    },
  },
});
