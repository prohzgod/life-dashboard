// @vitest-environment node
import { linkAction } from './syncLink';

const base = { serverHasData: false, deviceHasOwnData: false, ownerId: null, accountId: 'me' };

it('uploads when the account is empty', () => {
  expect(linkAction(base)).toBe('upload');
  expect(linkAction({ ...base, deviceHasOwnData: true })).toBe('upload');
});

it('takes the account when this device has nothing of its own', () => {
  expect(linkAction({ ...base, serverHasData: true })).toBe('useAccount');
});

it('asks when both have data', () => {
  expect(linkAction({ ...base, serverHasData: true, deviceHasOwnData: true })).toBe('ask');
});

it("never treats another account's data as this one's", () => {
  expect(linkAction({ ...base, ownerId: 'someone else' })).toBe('replaceOtherAccount');
  expect(linkAction({ ...base, ownerId: 'someone else', serverHasData: true, deviceHasOwnData: true })).toBe('replaceOtherAccount');
});

it('carries on when the same account comes back', () => {
  expect(linkAction({ ...base, ownerId: 'me', serverHasData: true, deviceHasOwnData: true })).toBe('resume');
});
