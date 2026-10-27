import { fromBase64, toBase64 } from './crypto';

/**
 * Touch ID, Face ID or Windows Hello through WebAuthn, with no server: the device checks it's you,
 * and the app only learns yes or no. It gates the screen; it isn't a key to your data.
 */

export async function biometricAvailable(): Promise<boolean> {
  try {
    return (await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.()) ?? false;
  } catch {
    return false;
  }
}

/** Registers this device's unlock (asks for a fingerprint or face once). Returns the credential id. */
export async function registerBiometric(): Promise<string> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Life Dashboard' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'Life Dashboard', displayName: 'You' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('No credential');
  return toBase64(credential.rawId);
}

/** Asks the device to confirm it's you. Resolves false when you cancel or it fails. */
export async function confirmBiometric(credentialId: string): Promise<boolean> {
  try {
    const result = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromBase64(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return Boolean(result);
  } catch {
    return false;
  }
}
