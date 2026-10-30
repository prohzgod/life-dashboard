import type { ReactCustomBlockRenderProps } from '@blocknote/react';
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Icon } from '@/components/icons/Icon';
import { parseGalleryItems, type GalleryItem, type GalleryConfig } from './galleryItems';
import { useAttachmentUrl } from './useAttachmentUrl';
import { useT } from '@/i18n';
import styles from './Editor.module.css';

function Tile({ item, onRemove, onCaption }: { item: GalleryItem; onRemove: () => void; onCaption: (caption: string) => void }) {
  const t = useT().library.editor;
  const src = useAttachmentUrl(item.url, true);
  return (
    <figure className={styles.tile}>
      <div className={styles.tileImage}>
        {src ? <img src={src} alt={item.caption || t.galleryImage} /> : <Icon name="image" size={20} />}
        <button type="button" className={styles.tileRemove} aria-label={t.removeImage(item.caption)} onClick={onRemove}>
          <Icon name="close" size={12} strokeWidth={2.4} />
        </button>
      </div>
      <textarea
        className={styles.tileCaption}
        aria-label={t.caption}
        placeholder={t.addCaption}
        rows={1}
        defaultValue={item.caption}
        onBlur={(e) => e.target.value !== item.caption && onCaption(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
    </figure>
  );
}

/** A grid of images inside a page: drop, paste or pick to add; captions edit in place. */
export function GalleryView({ block, editor }: ReactCustomBlockRenderProps<GalleryConfig>) {
  const t = useT().library.editor;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const items = parseGalleryItems(block.props.items);
  const save = (next: GalleryItem[]) => editor.updateBlock(block, { props: { items: JSON.stringify(next) } });

  async function add(files: Iterable<File>) {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length || !editor.uploadFile) return;
    setBusy(true);
    try {
      const added: GalleryItem[] = [];
      for (const file of images) {
        const url = await editor.uploadFile(file, block.id);
        if (typeof url === 'string') added.push({ url, caption: file.name.replace(/\.[^.]+$/, '') });
      }
      save([...parseGalleryItems(editor.getBlock(block)?.props.items ?? block.props.items), ...added]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.gallery} contentEditable={false}>
      {items.map((item, i) => (
        <Tile
          key={`${item.url}-${i}`}
          item={item}
          onRemove={() => save(items.filter((_, j) => j !== i))}
          onCaption={(caption) => save(items.map((it, j) => (j === i ? { ...it, caption } : it)))}
        />
      ))}
      <button
        type="button"
        className={styles.dropZone}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          void add(e.dataTransfer.files);
        }}
        onPaste={(e: ClipboardEvent) => {
          if (!e.clipboardData.files.length) return;
          e.preventDefault();
          e.stopPropagation();
          void add(e.clipboardData.files);
        }}
      >
        <Icon name="plus" size={18} />
        {busy ? t.adding : t.drop}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label={t.choose}
        onChange={(e) => {
          if (e.target.files) void add(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
