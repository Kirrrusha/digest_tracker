import { Injectable } from "@nestjs/common";

// TODO: перенести cron-задачи из apps/web/lib/cron
@Injectable()
export class CronService {
  async fetchPosts() {
    // TODO: перебрать все активные каналы и запустить fetchAndSaveChannelPosts
    return { fetched: 0 };
  }

  async dailySummary() {
    // TODO: сгенерировать дневное саммари через OpenAI
    return { generated: 0 };
  }

  async weeklySummary() {
    // TODO: сгенерировать недельное саммари через OpenAI
    return { generated: 0 };
  }
}
