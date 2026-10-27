import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { listPhotos, type Attachment } from '@/data';
import { cx } from '@/components/ui/cx';
import { plural } from '@/lib/format';
import { useObjectUrl } from '@/lib/useObjectUrl';
import styles from './Library.module.css';

export function PhotosView() {
  const photos = useLiveQuery(listPhotos);
  return (
    <main className={styles.main}>
      <article className={cx(styles.article, styles.wide)}>
        <h1 className={styles.pageTitle}>All photos</h1>
        <p className={styles.lead}>{photos ? `${plural(photos.length, 'image')}, stored on this device.` : ''}</p>
        {photos?.length === 0 && <p className={styles.railEmpty}>Images you add to pages and check-ins collect here.</p>}
        <ul className={styles.photoGrid}>
          {photos?.map((p) => <Photo key={p.id} photo={p} />)}
        </ul>
      </article>
    </main>
  );
}

function Photo({ photo }: { photo: Attachment }) {
  const url = useObjectUrl(photo.thumbBlob ?? photo.blob);
  const image = url ? <img src={url} alt={photo.caption || 'Photo'} loading="lazy" /> : null;
  return <li className={styles.photo}>{photo.nodeId ? <Link to={`/library/${photo.nodeId}`}>{image}</Link> : image}</li>;
}
