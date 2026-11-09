import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { listPhotos, type Attachment } from '@/data';
import { cx } from '@/components/ui/cx';
import { useObjectUrl } from '@/lib/useObjectUrl';
import { useT } from '@/i18n';
import styles from './Library.module.css';

export function PhotosView() {
  const t = useT().library.photos;
  const photos = useLiveQuery(listPhotos);
  return (
    <div className={styles.main}>
      <article className={cx(styles.article, styles.wide)}>
        <h1 className={styles.pageTitle}>{t.title}</h1>
        <p className={styles.lead}>{photos ? t.count(photos.length) : ''}</p>
        {photos?.length === 0 && <p className={styles.railEmpty}>{t.empty}</p>}
        <ul className={styles.photoGrid}>
          {photos?.map((p) => <Photo key={p.id} photo={p} />)}
        </ul>
      </article>
    </div>
  );
}

function Photo({ photo }: { photo: Attachment }) {
  const t = useT().library.photos;
  const url = useObjectUrl(photo.thumbBlob ?? photo.blob);
  const image = url ? <img src={url} alt={photo.caption || t.photo} loading="lazy" /> : null;
  return <li className={styles.photo}>{photo.nodeId ? <Link to={`/library/${photo.nodeId}`}>{image}</Link> : image}</li>;
}
