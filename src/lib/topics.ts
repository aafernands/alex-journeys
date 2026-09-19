import { getTopic, getTopicsBySection, type Topic } from "@/data/topics";
import { getPostBySlug, type Post, type PostMeta } from "@/lib/posts";

export function getTopicPosts(topic: Topic): PostMeta[] {
  return topic.postSlugs
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is Post => Boolean(p))
    .map(({ contentHtml: _c, source: _s, ...meta }) => meta);
}

export { getTopic, getTopicsBySection };
