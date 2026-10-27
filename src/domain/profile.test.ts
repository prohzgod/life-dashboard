import { ageOn, initialOf, visibilityOf } from './profile';

describe('profile helpers', () => {
  it('works out age, counting the birthday itself', () => {
    expect(ageOn('1992-03-12', '2026-03-11')).toBe(33);
    expect(ageOn('1992-03-12', '2026-03-12')).toBe(34);
    expect(ageOn('2000-02-29', '2026-02-28')).toBe(25);
  });

  it('takes the first letter for the avatar', () => {
    expect(initialOf('minh Tran')).toBe('M');
    expect(initialOf('  Đức')).toBe('Đ');
    expect(initialOf('')).toBe('');
  });

  it('defaults personal details to blurred', () => {
    expect(visibilityOf({}, 'email')).toBe('blurred');
    expect(visibilityOf({}, 'occupation')).toBe('shown');
    expect(visibilityOf({ email: 'shown' }, 'email')).toBe('shown');
    expect(visibilityOf({}, 'custom-1')).toBe('blurred');
  });
});
