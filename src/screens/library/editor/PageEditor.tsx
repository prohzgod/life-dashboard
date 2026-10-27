import '@blocknote/ariakit/style.css';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/ariakit';
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote, type DefaultReactSuggestionItem } from '@blocknote/react';
import { useEffect, useMemo, useRef } from 'react';
import { attachmentBlob, createNode, goalsRepo, listLibraryNodes, saveUpload, type LibraryNode } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { prepareImage } from '@/lib/images';
import { useResolvedTheme } from '@/theme/useResolvedTheme';
import { LinkSuggestionMenu, type LinkItem } from './LinkSuggestionMenu';
import { schema, type LifeEditor } from './schema';
import styles from './Editor.module.css';

type Props = {
  node: LibraryNode;
  /** Called with the editor's document, debounced while typing and once on leaving. */
  onSave: (document: unknown) => void;
  onSaving?: (saving: boolean) => void;
};

const SAVE_DELAY_MS = 600;

type GetLinkItems = (query: string) => Promise<LinkItem[]>;
const objectUrls = new Map<string, string>();

async function resolveFileUrl(url: string): Promise<string> {
  if (!url.startsWith('attachment://')) return url;
  const cached = objectUrls.get(url);
  if (cached) return cached;
  const blob = await attachmentBlob(url);
  if (!blob) return url;
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.set(url, objectUrl);
  return objectUrl;
}

export function PageEditor({ node, onSave, onSaving }: Props) {
  const theme = useResolvedTheme();
  const initialContent = useMemo(
    () => (Array.isArray(node.contentJson) && node.contentJson.length ? node.contentJson : undefined),
    // The editor owns the document after it opens; only a different page reloads it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.id],
  );

  const editor = useCreateBlockNote(
    {
      schema,
      initialContent: initialContent as never,
      uploadFile: async (file: File) => {
        const prepared = file.type.startsWith('image/') ? await prepareImage(file) : { blob: file, thumbBlob: null, width: null, height: null };
        const attachment = await saveUpload(node.id, { ...prepared, name: file.name });
        return `attachment://${attachment.id}`;
      },
      resolveFileUrl,
      placeholders: { emptyDocument: 'Type / for blocks, [[ to link a page, @ to mention a goal…', default: 'Type / for blocks' },
    },
    [node.id],
  );

  const timer = useRef<number | undefined>(undefined);
  const pending = useRef(false);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });

  const flush = () => {
    window.clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    saveRef.current(editor.document);
    onSaving?.(false);
  };

  // Save what's pending when leaving the page or hiding the tab.
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className={styles.editor}>
      <BlockNoteView
        editor={editor}
        theme={theme}
        slashMenu={false}
        onChange={() => {
          pending.current = true;
          onSaving?.(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
        }}
      >
        <SuggestionMenuController triggerCharacter="/" getItems={async (query) => filterSuggestionItems(slashItems(editor), query)} />
        <SuggestionMenuController<GetLinkItems>
          triggerCharacter="[["
          getItems={(query) => pageItems(editor, node, query)}
          suggestionMenuComponent={LinkSuggestionMenu}
          onItemClick={(item: LinkItem) => item.run()}
        />
        <SuggestionMenuController<GetLinkItems>
          triggerCharacter="@"
          getItems={(query) => goalItems(editor, query)}
          suggestionMenuComponent={LinkSuggestionMenu}
          onItemClick={(item: LinkItem) => item.run()}
        />
      </BlockNoteView>
    </div>
  );
}

function slashItems(editor: LifeEditor): DefaultReactSuggestionItem[] {
  return [
    ...getDefaultReactSlashMenuItems(editor),
    {
      title: 'Gallery',
      subtext: 'A grid of images. Drop, paste or pick them.',
      aliases: ['images', 'photos', 'grid'],
      group: 'Media',
      icon: <Icon name="image" size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'gallery' }),
    },
  ];
}

/** "[[" opens page links: matching pages, or a new page with the typed name. */
async function pageItems(editor: LifeEditor, current: LibraryNode, query: string): Promise<LinkItem[]> {
  const name = query.replace(/\]+$/, '').trim();
  const term = name.toLowerCase();
  const nodes = await listLibraryNodes();
  const insert = (target: { id: string; title: string }) => {
    editor.insertInlineContent([{ type: 'pageLink', props: { id: target.id, title: target.title } }, ' ']);
  };
  const matches = nodes
    .filter((n) => n.id !== current.id && (n.kind === 'page' || n.kind === 'folder') && n.title.toLowerCase().includes(term))
    .sort((a, b) => Number(!a.title.toLowerCase().startsWith(term)) - Number(!b.title.toLowerCase().startsWith(term)) || a.title.localeCompare(b.title))
    .slice(0, 8)
    .map<LinkItem>((n) => ({ key: n.id, label: n.title, hint: n.kind === 'folder' ? 'Folder' : 'Page', run: () => insert(n) }));
  const exact = nodes.some((n) => n.title.toLowerCase() === term);
  if (term && !exact) {
    matches.push({
      key: 'new',
      label: `New page “${name}”`,
      hint: 'Create',
      run: async () => {
        const created = await createNode({ parentId: current.parentId && !current.isSystem ? current.parentId : null, kind: 'page', title: name });
        insert(created);
      },
    });
  }
  return matches;
}

async function goalItems(editor: LifeEditor, query: string): Promise<LinkItem[]> {
  const term = query.trim().toLowerCase();
  const goals = await goalsRepo.list((g) => g.status === 'active' || g.status === 'paused');
  return goals
    .filter((g) => g.title.toLowerCase().includes(term))
    .slice(0, 8)
    .map((g) => ({
      key: g.id,
      label: g.title,
      hint: `${g.horizon[0]!.toUpperCase()}${g.horizon.slice(1)} goal`,
      run: () => editor.insertInlineContent([{ type: 'goalMention', props: { id: g.id, title: g.title } }, ' ']),
    }));
}
