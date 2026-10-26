import styles from './StorageError.module.css';

/** Shown when the browser won't let the app open its local database (e.g. storage blocked). */
export function StorageError() {
  return (
    <main className={styles.page}>
      <div className={styles.card} role="alert">
        <h1 className={styles.title}>Life Dashboard can’t open its storage</h1>
        <p className={styles.body}>
          Your browser is blocking storage for this site, so there’s nowhere safe to keep your data. Allow site data for this
          page (private windows often block it), then reload.
        </p>
      </div>
    </main>
  );
}
