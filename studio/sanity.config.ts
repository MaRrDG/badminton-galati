import { roROLocale } from '@sanity/locale-ro-ro';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { documentActions } from './actions';
import { schemaTypes } from './schemaTypes';
import { startTool } from './start/StartTool';
import { STRUCTURE_TOOL, newDocumentOptions, structure } from './structure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? '';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

export default defineConfig({
  name: 'default',
  title: 'Siderurgistul Galați',
  projectId,
  dataset,
  plugins: [structureTool({ name: STRUCTURE_TOOL, title: 'Conținut', structure }), roROLocale()],
  // The start screen is the first tool, so the Studio opens on it.
  tools: (prev) => [startTool, ...prev],
  schema: { types: schemaTypes },
  document: {
    singletons: ['siteSettings'],
    newDocumentOptions,
    actions: documentActions,
  },
  // Coaches publish one article at a time: no releases, scheduling or tasks in their navigation.
  // Without releases every publish also goes through the publish button (and `documentActions`).
  releases: { enabled: false },
  scheduledPublishing: { enabled: false },
  scheduledDrafts: { enabled: false },
  tasks: { enabled: false },
});
