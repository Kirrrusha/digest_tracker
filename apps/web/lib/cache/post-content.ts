import { CACHE_KEYS, CACHE_TTL, getCache, setCache } from "./redis";

/**
 * Сохранить контент поста в Redis
 */
export async function savePostContent(postId: string, content: string): Promise<void> {
  await setCache(CACHE_KEYS.postContent(postId), content, CACHE_TTL.WEEK);
}

/**
 * Получить контент поста из Redis
 */
export async function getPostContent(postId: string): Promise<string | null> {
  return getCache<string>(CACHE_KEYS.postContent(postId));
}

/**
 * Получить контент поста из Redis, при отсутствии — перезагрузить из источника
 */
export async function getPostContentWithRefetch(post: {
  id: string;
  externalId: string;
  channel: {
    sourceType: string;
    sourceUrl: string;
  };
}): Promise<string | null> {
  // Пробуем Redis
  const cached = await getPostContent(post.id);
  if (cached) return cached;

  // Перезагружаем из источника
  try {
    const { parserFactory } = await import("@/lib/parsers");
    const parser = parserFactory.getParser(
      post.channel.sourceType as "telegram" | "rss" | "telegram_bot" | "telegram_mtproto"
    );
    if (!parser?.fetchSinglePost) return null;

    const fetched = await parser.fetchSinglePost(post.channel.sourceUrl, post.externalId);
    if (fetched?.content) {
      await savePostContent(post.id, fetched.content);
      return fetched.content;
    }
  } catch (error) {
    console.error("[PostContent] Re-fetch failed:", error);
  }

  return null;
}

/**
 * Массовое сохранение контента постов в Redis
 */
export async function savePostContentBatch(
  posts: { id: string; content: string }[]
): Promise<void> {
  await Promise.all(posts.map((post) => savePostContent(post.id, post.content)));
}
