import { looksLikeSomeday, suggestArea } from './suggest';

const areas = ['Health', 'Career', 'Finance', 'Family', 'Friends', 'Growth', 'Home', 'Fun'].map((name) => ({ id: name.toLowerCase(), name }));

describe('suggestArea', () => {
  it.each([
    ['Renew car insurance', 'finance'],
    ['Book dentist appointment', 'health'],
    ['Pick up dry cleaning', 'home'],
    ['Call Mom', 'family'],
    ['Outline essay #9', 'growth'],
  ])('%s → %s', (title, id) => {
    expect(suggestArea(title, areas)?.id).toBe(id);
  });

  it('matches word starts only, and gives up on a tie or nothing', () => {
    expect(suggestArea('Spray the carpet', areas)).toBeNull(); // "pay" inside "spray"
    expect(suggestArea('Buy stamps', areas)).toBeNull();
    expect(suggestArea('Pay for the yoga class', areas)).toBeNull(); // finance vs health
  });

  it('ignores areas it has no hints for', () => {
    expect(suggestArea('Pay rent', [{ id: 'x', name: 'Side hustle' }])).toBeNull();
  });
});

describe('looksLikeSomeday', () => {
  it('spots ideas and wish-list items', () => {
    expect(looksLikeSomeday('Idea: monthly photo book for Mom')).toBe(true);
    expect(looksLikeSomeday('Book: The Overstory')).toBe(true);
    expect(looksLikeSomeday('Book dentist appointment')).toBe(false);
  });
});
