import { Dialog } from '../ui/Dialog';
import { EmptyState } from './EmptyState';

type QuickCaptureProps = { open: boolean; onClose: () => void };

/** ⌘N. The real capture box arrives with the Inbox; until then this explains what it will do. */
export function QuickCapture({ open, onClose }: QuickCaptureProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Quick capture">
      <EmptyState
        icon="inbox"
        heading="Capture is almost here"
        body="Soon this box will save a thought, task or link straight to your Inbox in under three seconds, even offline."
        bare
      />
    </Dialog>
  );
}
