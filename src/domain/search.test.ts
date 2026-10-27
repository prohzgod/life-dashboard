import { searchDocs } from './search';

const docs = [
  { id: '1', title: 'Japan trip 2027', text: 'Two weeks in April. Kyoto first, then Tokyo.' },
  { id: '2', title: 'Budget', text: 'Flights to Japan, hotels in Kyoto.' },
  { id: '3', title: 'Recipes', text: 'Miso soup. Café au lait.' },
];

describe('searchDocs', () => {
  it('needs every word, and ranks title matches first', () => {
    expect(searchDocs(docs, 'japan').map((h) => h.id)).toEqual(['1', '2']);
    expect(searchDocs(docs, 'kyoto flights').map((h) => h.id)).toEqual(['2']);
    expect(searchDocs(docs, 'japan rome')).toEqual([]);
  });

  it('ignores case and accents', () => {
    expect(searchDocs(docs, 'CAFE').map((h) => h.id)).toEqual(['3']);
  });

  it('returns a snippet around the match', () => {
    const long = { id: '4', title: 'Notes', text: `${'x '.repeat(80)}the needle is here ${'y '.repeat(80)}` };
    const [hit] = searchDocs([long], 'needle');
    expect(hit!.snippet).toMatch(/^….*the needle is here.*…$/);
    expect(hit!.snippet.length).toBeLessThan(140);
  });

  it('returns nothing for an empty query', () => {
    expect(searchDocs(docs, '   ')).toEqual([]);
  });
});
