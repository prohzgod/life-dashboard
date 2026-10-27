import { blocksToAttachmentIds, blocksToLinks, blocksToText, checklistProgress } from './blocks';

const doc = [
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Before we go', styles: {} }], children: [] },
  {
    type: 'checkListItem',
    props: { checked: true },
    content: [{ type: 'text', text: 'Renew passports', styles: {} }],
    children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nested note', styles: {} }], children: [] }],
  },
  {
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Costs live in ', styles: {} },
      { type: 'pageLink', props: { id: 'PAGE1', title: 'Budget' } },
      { type: 'text', text: ', linked to ', styles: {} },
      { type: 'goalMention', props: { id: 'GOAL1', title: 'Japan fund' } },
      { type: 'link', href: 'https://example.com', content: [{ type: 'text', text: ' (site)', styles: {} }] },
    ],
    children: [],
  },
  { type: 'image', props: { url: 'attachment://01HZY8M4X1N3ABCDEF0123456A', caption: 'Fushimi Inari gates' }, children: [] },
  { type: 'gallery', props: { items: '[{"url":"attachment://01HZY8M4X1N3ABCDEF0123456B"}]' }, children: [] },
  { type: 'paragraph', content: [{ type: 'pageLink', props: { id: 'PAGE1', title: 'Budget' } }], children: [] },
  { type: 'table', content: { type: 'tableContent', rows: [{ cells: [[{ type: 'text', text: 'Cell A', styles: {} }]] }] }, children: [] },
];

describe('blocksToText', () => {
  it('collects every block’s words, links and captions included', () => {
    expect(blocksToText(doc).split('\n')).toEqual([
      'Before we go',
      'Renew passports',
      'Nested note',
      'Costs live in Budget, linked to Japan fund (site)',
      'Fushimi Inari gates',
      'Budget',
      'Cell A',
    ]);
  });

  it('copes with empty or odd input', () => {
    expect(blocksToText(null)).toBe('');
    expect(blocksToText([{ type: 'paragraph' }])).toBe('');
  });
});

describe('blocksToLinks', () => {
  it('finds distinct page links and goal mentions', () => {
    expect(blocksToLinks(doc)).toEqual([
      { toType: 'node', toId: 'PAGE1' },
      { toType: 'goal', toId: 'GOAL1' },
    ]);
  });
});

describe('blocksToAttachmentIds', () => {
  it('finds attachments in images and galleries', () => {
    expect(blocksToAttachmentIds(doc)).toEqual(['01HZY8M4X1N3ABCDEF0123456A', '01HZY8M4X1N3ABCDEF0123456B']);
  });
});

describe('checklistProgress', () => {
  it('counts the first checklist under its heading', () => {
    const blocks = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Before we go' }] },
      { type: 'checkListItem', props: { checked: true }, content: [] },
      { type: 'checkListItem', props: { checked: false }, content: [] },
      { type: 'checkListItem', props: { checked: false }, content: [] },
      { type: 'paragraph', content: [] },
      { type: 'checkListItem', props: { checked: true }, content: [] },
    ];
    expect(checklistProgress(blocks)).toEqual({ label: 'Before we go', done: 1, total: 3 });
    expect(checklistProgress([{ type: 'paragraph' }])).toBeNull();
  });
});
