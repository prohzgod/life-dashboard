export type LinkAction = 'upload' | 'useAccount' | 'ask' | 'replaceOtherAccount' | 'resume';

type LinkInput = {
  serverHasData: boolean;
  deviceHasOwnData: boolean;
  /** The account whose data is on this device, if any has been. */
  ownerId: string | null;
  accountId: string;
};

/** What to do when an account signs in on this device. Another account's data comes first: it must never upload. */
export function linkAction({ serverHasData, deviceHasOwnData, ownerId, accountId }: LinkInput): LinkAction {
  if (ownerId && ownerId !== accountId) return 'replaceOtherAccount';
  if (ownerId === accountId) return 'resume';
  if (!serverHasData) return 'upload';
  return deviceHasOwnData ? 'ask' : 'useAccount';
}
