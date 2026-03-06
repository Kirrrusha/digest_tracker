import { Injectable, Logger } from "@nestjs/common";

import type { ExternalIntegration, SaveablePost } from "./external-integration.interface";

/**
 * Raindrop.io integration placeholder.
 *
 * To implement:
 * 1. Add RAINDROP_TOKEN env var per user (stored in UserPreferences or a separate table)
 * 2. POST https://api.raindrop.io/rest/v1/raindrop with Bearer token
 *    body: { link, title, excerpt, tags, collection: { $id } }
 */
@Injectable()
export class RaindropIntegration implements ExternalIntegration {
  readonly name = "raindrop";
  private readonly logger = new Logger(RaindropIntegration.name);

  async savePost(post: SaveablePost, userId: string): Promise<void> {
    // TODO: fetch user's Raindrop token from preferences/settings
    // TODO: call Raindrop REST API to save bookmark
    this.logger.debug(`[raindrop] savePost userId=${userId} url=${post.url} (not yet implemented)`);
  }
}
