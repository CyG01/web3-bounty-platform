export type CommentItem = {
  id: string;
  bountyId: number;
  author: string;
  content: string;
  createdAt: number;
};

const COMMENTS_API_URL = String(import.meta.env.VITE_COMMENTS_API_URL || '').trim();

function storageKey(bountyId: number) {
  return `comments:${bountyId}`;
}

function now() {
  return Date.now();
}

export async function fetchComments(bountyId: number, opts?: { token?: string }) {
  if (!bountyId) return [] as CommentItem[];

  if (COMMENTS_API_URL) {
    const res = await globalThis.fetch(
      `${COMMENTS_API_URL.replace(/\/+$/, '')}/comments?bountyId=${encodeURIComponent(String(bountyId))}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...(opts?.token ? { authorization: `Bearer ${opts.token}` } : {}),
        },
      }
    );
    if (!res.ok) throw new Error(`Comments HTTP ${res.status}`);
    const json = (await res.json()) as { items?: CommentItem[] };
    return Array.isArray(json.items) ? json.items : [];
  }

  try {
    const raw = globalThis.localStorage?.getItem(storageKey(bountyId));
    const arr = raw ? (JSON.parse(raw) as CommentItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function postComment(
  bountyId: number,
  input: { author: string; content: string },
  opts?: { token?: string }
) {
  if (!bountyId) throw new Error('Invalid bountyId');
  if (!input.author) throw new Error('Missing author');
  const content = String(input.content || '').trim();
  if (!content) throw new Error('Empty content');

  if (COMMENTS_API_URL) {
    const res = await globalThis.fetch(`${COMMENTS_API_URL.replace(/\/+$/, '')}/comments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(opts?.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: JSON.stringify({ bountyId, author: input.author, content }),
    });
    if (!res.ok) throw new Error(`Comments HTTP ${res.status}`);
    const json = (await res.json()) as { item?: CommentItem };
    if (!json.item) throw new Error('Comments API returned empty item');
    return json.item;
  }

  const item: CommentItem = {
    id: `${input.author.toLowerCase()}_${now()}_${Math.floor(Math.random() * 100000)}`,
    bountyId,
    author: input.author,
    content,
    createdAt: now(),
  };

  const items = await fetchComments(bountyId);
  const next = [item, ...items].slice(0, 200);
  try {
    globalThis.localStorage?.setItem(storageKey(bountyId), JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return item;
}
