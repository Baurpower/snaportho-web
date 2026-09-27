import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeSourcePageUrl,
  plainFieldText,
  snapshotFields,
} from './anki-page-identity.ts';

assert.deepEqual(
  normalizeSourcePageUrl(
    'https://www.orthobullets.com/trauma/123/topic?utm_source=mail&questionId=42#answer',
    'orthobullets',
  ),
  {
    canonicalUrl: 'https://orthobullets.com/trauma/123/topic?questionId=42',
    sourceUrl: 'https://orthobullets.com/trauma/123/topic?questionId=42',
  },
);
assert.equal(
  normalizeSourcePageUrl(
    'https://rock.aaos.org/coursecontent.aspx?id=ankle&token=secret&accessToken=secret2&apiKey=secret3&client_secret=secret4',
    'rock',
  )?.canonicalUrl,
  'https://rock.aaos.org/coursecontent.aspx?id=ankle',
);
assert.equal(normalizeSourcePageUrl('http://orthobullets.com/topic', 'orthobullets'), null);
assert.equal(normalizeSourcePageUrl('https://notorthobullets.com/topic', 'orthobullets'), null);
assert.equal(normalizeSourcePageUrl('https://learn.aaos.org/course', 'rock'), null);
assert.equal(normalizeSourcePageUrl('https://user:pass@rock.aaos.org/course', 'rock'), null);
assert.equal(
  plainFieldText('<p>Front &amp; Back</p><script>never persist()</script>'),
  'Front & Back',
);
assert.deepEqual(snapshotFields([{ name: 'Front', value: '<p>Card text</p>' }, null]), [
  { name: 'Front', text: 'Card text' },
]);

const migration = readFileSync('supabase/migrations/20260926190000_brobot_anki_page_links.sql', 'utf8');
assert.match(migration, /primary key \(user_id, canonical_card_id, source_page_id\)/i);
assert.match(migration, /foreign key \(user_id, source_page_id\)[\s\S]*references public\.brobot_anki_source_pages\(user_id, id\)/i);
assert.match(migration, /user_id = \(select auth\.uid\(\)\)/i);
assert.match(migration, /canonical_url ~ '\^https:\/\/orthobullets/i);
assert.match(migration, /canonical_url ~ '\^https:\/\/rock\\\.aaos\\\.org/i);

console.log('Anki page identity and preview tests passed.');
