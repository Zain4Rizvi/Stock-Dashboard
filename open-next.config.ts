import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Branch previews run `pnpm run build`. That script is the OpenNext build, so the
// inner Next.js compile must not call `pnpm build` again.
export default {
  ...defineCloudflareConfig(),
  buildCommand: "pnpm exec next build",
};
