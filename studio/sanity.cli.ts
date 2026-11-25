import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? '',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // The hosted Studio: https://siderurgistul-galati.sanity.studio/ (first deployed with
  // `sanity deploy --url siderurgistul-galati`). `deployment.appId` is what `sanity deploy`
  // uses; `studioHost` names the same host for readers and for older CLI paths.
  studioHost: 'siderurgistul-galati',
  deployment: { appId: 'xh8y1sp6xeq1xpsztxu72whq' },
});
