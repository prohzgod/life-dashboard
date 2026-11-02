import { R2FileStore } from '../src/files/r2-file-store';

const store = new R2FileStore('acct', 'key', 'secret', 'bucket');

it('signs a PUT for this bucket on the R2 endpoint, without checksum parameters', async () => {
  const url = new URL(await store.presignPut('users/u/attachments/a/original', 'image/jpeg', 10));
  expect(url.hostname).toBe('bucket.acct.r2.cloudflarestorage.com');
  expect(url.pathname).toBe('/users/u/attachments/a/original');
  expect(url.search).not.toMatch(/checksum/i);
  expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
  expect(url.searchParams.get('X-Amz-SignedHeaders')).toMatch(/content-length/);
});

it('signs a GET', async () => {
  const url = new URL(await store.presignGet('users/u/attachments/a/thumb'));
  expect(url.pathname).toBe('/users/u/attachments/a/thumb');
});
