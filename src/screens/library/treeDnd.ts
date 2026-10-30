import { createContext } from 'react';
import { TouchBackend } from 'react-dnd-touch-backend';
import type { NodeKind } from '@/data';

/**
 * Drag and drop on phones. The tree's default backend listens for HTML5 drag events, which touch
 * screens never fire. This one starts a drag after a short press and hold, so a quick swipe still
 * scrolls the list.
 */
export const longPressBackend: typeof TouchBackend = (manager, context, options) =>
  TouchBackend(manager, context, { ...options, delayTouchStart: 350, ignoreContextMenu: true, enableMouseEvents: false });

/** Titles and kinds by id, so the drag preview can name what you're carrying. */
export const TreeLookup = createContext<Map<string, { title: string; kind: NodeKind }>>(new Map());
