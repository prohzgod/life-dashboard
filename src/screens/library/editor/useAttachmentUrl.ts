import { useLiveQuery } from 'dexie-react-hooks';
import { attachmentBlob } from '@/data';
import { useObjectUrl } from '@/lib/useObjectUrl';

/** A displayable URL for an `attachment://` reference (or any other URL, unchanged). */
export function useAttachmentUrl(url: string, thumb = false): string | null {
  const blob = useLiveQuery(() => (url.startsWith('attachment://') ? attachmentBlob(url, thumb) : Promise.resolve(null)), [url, thumb]);
  const objectUrl = useObjectUrl(blob);
  return url.startsWith('attachment://') ? objectUrl : url;
}
