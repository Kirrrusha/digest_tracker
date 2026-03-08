import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller(".well-known")
export class WellKnownController {
  constructor(private config: ConfigService) {}

  @Get("assetlinks.json")
  assetLinks() {
    const fingerprint = this.config.get<string>("ANDROID_APP_FINGERPRINT", "");
    return [
      {
        relation: ["delegate_permission/common.get_login_creds"],
        target: {
          namespace: "android_app",
          package_name: "com.devdigest.mobile",
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ];
  }

  @Get("apple-app-site-association")
  appleAppSiteAssociation() {
    const teamId = this.config.get<string>("APPLE_TEAM_ID", "");
    const bundleId = this.config.get<string>("IOS_BUNDLE_ID", "com.devdigest.mobile");
    return {
      webcredentials: {
        apps: [`${teamId}.${bundleId}`],
      },
    };
  }
}
