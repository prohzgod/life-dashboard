import { createReactInlineContentSpec } from '@blocknote/react';
import { GoalMentionChip, PageLinkChip } from './InlineChips';

export const PageLink = createReactInlineContentSpec(
  { type: 'pageLink', propSchema: { id: { default: '' }, title: { default: '' } }, content: 'none' },
  { render: ({ inlineContent }) => <PageLinkChip id={inlineContent.props.id} title={inlineContent.props.title} /> },
);

export const GoalMention = createReactInlineContentSpec(
  { type: 'goalMention', propSchema: { id: { default: '' }, title: { default: '' } }, content: 'none' },
  { render: ({ inlineContent }) => <GoalMentionChip id={inlineContent.props.id} title={inlineContent.props.title} /> },
);
