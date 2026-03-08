import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { WellKnownController } from "./well-known.controller";

@Module({ controllers: [HealthController, WellKnownController] })
export class HealthModule {}
