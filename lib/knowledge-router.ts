import type { Chunk, KnowledgeBase } from './published-context';

/**
 * Picks which knowledge-base chunks a turn gets, with no model call. The last few
 * visitor messages are scanned for topic keywords; matches from the newest message
 * win, and the total stays under a character budget. A turn with no match sends no
 * notes at all, which is what keeps small talk free of unprompted biography.
 */
export const ROUTE_WINDOW_USER_TURNS = 3;
export const ROUTE_CHAR_BUDGET = 3000;

/** Chunk id → trigger. Order matters only as a tie-break within one message. */
const TAGS: Array<[string, RegExp]> = [
  ['pwc', /\b(pwc|pricewaterhouse|tide)\b/i],
  ['visa', /\bvisa\b/i],
  ['afterquery', /\b(after ?query|manus|yc ?w25)\b/i],
  ['profluento-ai', /\b(profluento|co-?founder|cto|startup|lead scoring|wealth)\b/i],
  ['cdk-global', /\b(cdk|dealerships?|iam)\b/i],
  ['killmycluster', /\b(kill ?my ?cluster|kmc|raft|kv store|key[- ]?value|consensus|leader election|wal)\b/i],
  ['faultline', /\b(fault ?line|replay|rcaeval|outages?|incidents?|arrow|axum)\b/i],
  ['lapsynk', /\b(lap ?synk|hacktx|hackathon|formula ?(1|one)|f1|race)\b/i],
  ['skills', /\b(skills?|languages?|stack|tools|frameworks?|rust|golang|python|typescript|java|kubernetes|kafka|databases?)\b/i],
  ['college-journey', /\b(applications?|essays?|admissions?|college journey|applying|got into)\b/i],
  ['experience-all', /\b(experience|intern(ship)?s?|jobs?|work(ed|ing)?|career|companies|employ(er|ment)s?|resume|résumé|cv)\b/i],
  ['projects-all', /\b(projects?|built|building|made|side projects?|portfolio|github)\b/i],
  ['overview', /\b(who is|who's|about anush|about him|tell me about|background|school|college|university|ut austin|utexas|graduat\w*|major|minor|degree|student|education|contact|email|linkedin|bio)\b/i],
];

function matchedIds(message: string): string[] {
  const ids: string[] = [];
  for (const [id, re] of TAGS) {
    if (re.test(message)) ids.push(id);
  }
  return ids;
}

/**
 * `userMessages` is the visitor's turns oldest → newest. Only the last
 * ROUTE_WINDOW_USER_TURNS are read so "what did he do there?" still carries the
 * topic from a message or two back.
 */
export function selectChunks(userMessages: string[], kb: KnowledgeBase): Chunk[] {
  const window = userMessages.slice(-ROUTE_WINDOW_USER_TURNS).reverse();
  const ordered: string[] = [];
  for (const message of window) {
    for (const id of matchedIds(message)) {
      if (!ordered.includes(id)) ordered.push(id);
    }
  }
  if (ordered.length === 0) return [];

  const byId = new Map(kb.chunks.map((c) => [c.id, c] as const));
  const picked: Chunk[] = [];
  let used = 0;
  for (const id of ordered) {
    const chunk = byId.get(id);
    if (!chunk) continue;
    if (used + chunk.text.length > ROUTE_CHAR_BUDGET) continue;
    picked.push(chunk);
    used += chunk.text.length;
  }
  return picked;
}
