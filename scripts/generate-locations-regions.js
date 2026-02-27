/**
 * Generates SQL migration for regions (states/territories) from dr5hn/countries-states-cities-database.
 * Run: node scripts/generate-locations-regions.js
 * Output: supabase/migrations/20260301000000_locations_seed_regions_all.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HAVE_REGIONS = new Set([
  'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'MX', 'BR', 'IN', 'JP', 'CN', 'NL', 'BE', 'CH', 'AT', 'PT', 'IE', 'AR', 'ZA', 'NZ', 'PH'
]);

function escapeSql(s) {
  if (typeof s !== 'string') return "''";
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

async function main() {
  const base = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json';
  const countriesRes = await fetch(base + '/countries.json');
  const countries = await countriesRes.json();
  const nameToIso2 = Object.fromEntries(countries.map((c) => [c.name, c.iso2]));

  const csRes = await fetch(base + '/countries%2Bstates.json');
  const countriesStates = await csRes.json();

  const lines = [
    '-- Regions (states/territories) for all countries that have them in dr5hn/countries-states-cities-database.',
    '-- Skips countries already seeded in 20260230100016_locations_seed.sql.',
    ''
  ];

  for (const entry of countriesStates) {
    const iso2 = nameToIso2[entry.name];
    if (!iso2 || HAVE_REGIONS.has(iso2)) continue;
    const states = entry.states;
    if (!states || !Array.isArray(states) || states.length === 0) continue;

    const escaped = states.map((s) => escapeSql(s)).join(',');
    lines.push(`-- ${entry.name} (${iso2})`);
    lines.push(`INSERT INTO public.regions (country_id, name, type)`);
    lines.push(`SELECT id, unnest(ARRAY[${escaped}]), 'state'`);
    lines.push(`FROM public.countries c WHERE c.code_alpha2 = '${iso2}' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);`);
    lines.push('');
  }

  const sql = lines.join('\n');
  const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260301000000_locations_seed_regions_all.sql');
  await fs.promises.writeFile(outPath, sql, 'utf8');
  console.log('Wrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
