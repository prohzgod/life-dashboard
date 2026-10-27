import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { initialOf } from '@/domain/profile';
import { getAttachment, getProfile } from '@/data';
import { useObjectUrl } from '@/lib/useObjectUrl';
import { Icon } from '../icons/Icon';
import { cx } from '../ui/cx';
import styles from './ProfileAvatar.module.css';

/** The profile photo or initial. As a link (top-right of every tab root) it opens Profile. */
export function ProfileAvatar({ size = 'sm', asLink = true }: { size?: 'sm' | 'lg'; asLink?: boolean }) {
  const data = useLiveQuery(async () => {
    const profile = await getProfile();
    const photo = profile.photoAttachmentId ? await getAttachment(profile.photoAttachmentId) : undefined;
    return { profile, photo };
  });
  const url = useObjectUrl(data?.photo?.thumbBlob ?? data?.photo?.blob);
  const initial = data ? initialOf(data.profile.displayName) : '';
  const content = url ? <img src={url} alt="" /> : initial || <Icon name="users" size={size === 'lg' ? 34 : 18} />;
  if (!asLink) return <span className={cx(styles.avatar, styles[size])}>{content}</span>;
  return (
    <Link to="/profile" className={cx(styles.avatar, styles[size])} aria-label="Profile and settings">
      {content}
    </Link>
  );
}
