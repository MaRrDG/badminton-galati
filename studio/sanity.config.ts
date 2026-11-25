import { roROLocale } from '@sanity/locale-ro-ro';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? '';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

export default defineConfig({
  name: 'default',
  title: 'Siderurgistul Galați',
  projectId,
  dataset,
  plugins: [
    structureTool({
      title: 'Conținut',
      structure: (S) =>
        S.list()
          .title('Conținut')
          .items([
            S.listItem().singleton('siteSettings').title('Pagina principală'),
            S.divider(),
            S.documentTypeListItem('post').title('Articole'),
            S.documentTypeListItem('competition').title('Calendar competițional'),
            S.documentTypeListItem('athlete').title('Sportivi'),
            S.documentTypeListItem('group').title('Grupe'),
          ]),
    }),
    roROLocale(),
  ],
  schema: { types: schemaTypes },
  document: {
    singletons: ['siteSettings'],
  },
});
