import { Module } from "@nestjs/common";

import { RaindropIntegration } from "./raindrop.integration";

@Module({
  providers: [RaindropIntegration],
  exports: [RaindropIntegration],
})
export class ExternalIntegrationsModule {}
