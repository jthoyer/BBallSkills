#!/usr/bin/env node
/**
 * gen-watchlist.mjs: writes WATCHLIST.md from site/js/content.js.
 * Lists every resource with watched:false. Run it after flipping `watched`
 * to true on a video, then commit the result. Dev-only, plain Node.
 *   node scripts/gen-watchlist.mjs
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { drills, resources } = await import(pathToFileURL(join(root, 'site/js/content.js')).href);

const cell = (s) => String(s).replace(/\|/g, '\\|');
const rows = [];
let n = 0;
for (const [k, d] of Object.entries(drills)) {
  const r = resources[k === d.resource ? k : d.resource];
  if (!r || r.watched !== false) continue;
  n += 1;
  rows.push(
    `| ${n} | ${cell(d.title)} (${d.group}, ${d.level}) | ${cell(r.title)} | ${cell(r.channel.name)} | https://www.youtube.com/watch?v=${r.youtubeId} | ${cell(r.found.searchTitle)} |`
  );
}

const out = `# Watch list

Nobody has watched these videos. Each one was found by a web search, and its ID was copied
from a YouTube URL the search returned. Before the pull request merges, a person must watch
each video all the way through and check that it shows what its drill page says. Then set
\`watched: true\` on that resource in \`site/js/content.js\` and re-run
\`node scripts/gen-watchlist.mjs\`.

Check, for each video:

1. It plays, and it is the video named in the table.
2. It shows the drill its page describes, with no claim on the page that the video does not support.
3. It is suitable for players aged 10 to 15 (language, content, no unsafe technique).
4. The channel credited is the channel that made it. All 18 are credited to Jr. NBA because the search results described them as Jr. NBA coach videos; the search did not show the channel page for each one.

**${n} videos still to watch.** The "Recorded search title" column is the title the search returned.
It is evidence of what was found, not proof of what the video shows.

| # | Drill | Video title | Channel | Link | Recorded search title |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(join(root, 'WATCHLIST.md'), out);
console.log(`WATCHLIST.md written: ${n} rows`);
