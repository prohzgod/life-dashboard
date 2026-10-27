import { taggingsRepo, tagsRepo } from './repositories';
import type { LinkTarget, Tag } from './types';

/** Replaces the tags on a task, page or other record, creating tags that don't exist yet. */
export async function setTags(targetType: LinkTarget, targetId: string, names: readonly string[]): Promise<void> {
  const wanted = [...new Set(names.map((n) => n.replace(/^#/, '').trim().toLowerCase()).filter(Boolean))];
  const allTags = await tagsRepo.list();
  const current = await taggingsRepo.list((t) => t.targetType === targetType && t.targetId === targetId);
  const tagIds: string[] = [];
  for (const name of wanted) {
    const tag = allTags.find((t) => t.name === name) ?? (await tagsRepo.create({ name }));
    tagIds.push(tag.id);
  }
  for (const tagging of current) if (!tagIds.includes(tagging.tagId)) await taggingsRepo.remove(tagging.id);
  for (const tagId of tagIds) {
    if (!current.some((t) => t.tagId === tagId)) await taggingsRepo.create({ tagId, targetType, targetId });
  }
}

export async function tagsFor(targetType: LinkTarget, targetId: string): Promise<Tag[]> {
  const taggings = await taggingsRepo.list((t) => t.targetType === targetType && t.targetId === targetId);
  const tags = await tagsRepo.list();
  return taggings.map((t) => tags.find((tag) => tag.id === t.tagId)).filter((t): t is Tag => !!t);
}
