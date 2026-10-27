import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { GalleryBlock } from './GalleryBlock';
import { GoalMention, PageLink } from './inline';

export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, gallery: GalleryBlock() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, pageLink: PageLink, goalMention: GoalMention },
});

export type LifeEditor = typeof schema.BlockNoteEditor;
