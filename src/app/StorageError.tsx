import { messages } from '@/i18n';
import styles from './StorageError.module.css';

/** Shown when the browser won't let the app open its local database (e.g. storage blocked). */
export function StorageError() {
  const t = messages().shell.storageError;
  return (
    <main className={styles.page}>
      <div className={styles.card} role="alert">
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.body}>{t.body}</p>
      </div>
    </main>
  );
}
