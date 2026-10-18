/**
 * Quick validation: test the wikiParser against live Fandom API
 * for The Great Ruler (Mu Chen) and BTTH (Xiao Yan).
 *
 * Run: node scripts/test-parser.mjs
 */

import { parseFandomPage } from './wikiParser.mjs';

async function fetchPage(subdomain, page) {
  const url = `https://${subdomain}.fandom.com/api.php?` +
    `action=parse&page=${encodeURIComponent(page)}` +
    `&prop=wikitext|text&redirects=1&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const parsed = data?.parse || {};
  return {
    title: parsed.title || page,
    wikitext: parsed.wikitext?.['*'] || '',
    html: parsed.text?.['*'] || '',
  };
}

function report(label, result) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
  console.log(`  introText (${result.introText.length} chars): ${result.introText.substring(0, 120)}...`);
  console.log(`  appearance (${result.appearance.length} chars): ${result.appearance ? '✓' : '✗ MISSING'}`);
  console.log(`  personality (${result.personality.length} chars): ${result.personality ? '✓' : '✗ MISSING'}`);
  console.log(`  history (${result.history.length} chars): ${result.history ? '✓' : '✗ MISSING'}`);
  console.log(`  trivia (${result.trivia.length} chars): ${result.trivia ? '✓' : '✗ MISSING'}`);
  console.log(`  quotes (${result.quotes.length} chars): ${result.quotes ? '✓' : '✗ MISSING'}`);
  console.log(`  infobox fields (${Object.keys(result.infobox).length}): ${Object.keys(result.infobox).join(', ')}`);
  console.log(`  wikilinks: ${JSON.stringify(result.wikilinks).substring(0, 200)}`);
  console.log(`  allImages: ${result.allImages.length} found, top: ${result.allImages[0] || 'none'}`);
}

async function main() {
  console.log('Testing wikiParser.mjs against live Fandom API...\n');

  // Test 1: The Great Ruler - Mu Chen
  console.log('Fetching The Great Ruler - Mu Chen...');
  const tgr = await fetchPage('thegreatruler', 'Mu_Chen');
  const tgrResult = parseFandomPage(tgr.wikitext, tgr.html, 'thegreatruler');
  report('The Great Ruler — Mu Chen', tgrResult);

  await new Promise(r => setTimeout(r, 500));

  // Test 2: BTTH - Xiao Yan
  console.log('\nFetching BTTH - Xiao Yan...');
  const btth = await fetchPage('battle-through-the-heavens', 'Xiao_Yan');
  const btthResult = parseFandomPage(btth.wikitext, btth.html, 'battle-through-the-heavens');
  report('BTTH — Xiao Yan', btthResult);

  await new Promise(r => setTimeout(r, 500));

  // Test 3: Xian-Ni - Wang Lin
  console.log('\nFetching Xian-Ni - Wang Lin...');
  const xn = await fetchPage('xian-ni', 'Wang_Lin');
  const xnResult = parseFandomPage(xn.wikitext, xn.html, 'xian-ni');
  report('Xian-Ni — Wang Lin', xnResult);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  const tests = [
    { name: 'TGR Mu Chen',    r: tgrResult },
    { name: 'BTTH Xiao Yan',  r: btthResult },
    { name: 'Xian-Ni Wang Lin', r: xnResult },
  ];
  tests.forEach(({ name, r }) => {
    const pass = r.appearance && r.personality && Object.keys(r.infobox).length > 0;
    console.log(`  ${pass ? '✅' : '❌'} ${name}: infobox=${Object.keys(r.infobox).length} fields, ` +
      `app=${r.appearance ? '✓' : '✗'}, per=${r.personality ? '✓' : '✗'}, ` +
      `hist=${r.history ? '✓' : '✗'}`);
  });
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
