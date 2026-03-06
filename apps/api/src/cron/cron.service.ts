import { Injectable } from "@nestjs/common";

@Injectable()
export class CronService {
  async dailySummary() {
    // Summaries are generated on-demand via POST /summaries/generate
    return { generated: 0 };
  }

  async weeklySummary() {
    // Summaries are generated on-demand via POST /summaries/generate
    return { generated: 0 };
  }
}
