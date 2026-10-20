import type { CameraErrorInfo, CameraFacingMode } from '../types.ts';

/**
 * Checks if the current browser environment supports camera access
 */
export function checkCameraSupport(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'SSR' };
  }

  // Camera requires HTTPS or localhost
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return {
      supported: false,
      reason: 'insecure_context',
    };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      reason: 'unsupported_api',
    };
  }

  return { supported: true };
}

/**
 * Parses browser camera errors into actionable French messages
 */
export function parseCameraError(error: unknown): CameraErrorInfo {
  const err = error as Error & { name?: string };
  const name = err?.name || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      type: 'permission_denied',
      title: 'Accès caméra refusé',
      message: "L'autorisation d'accéder à la caméra a été refusée par votre navigateur.",
      actionHint: "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur (icône cadenas dans la barre d'adresse sous Chrome ou Réglages > Safari sous iOS).",
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      type: 'not_found',
      title: 'Aucune caméra détectée',
      message: 'Aucun capteur vidéo disponible sur cet appareil.',
      actionHint: 'Vérifiez que votre caméra est branchée ou activez le mode Simulation pour tester les filtres.',
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      type: 'in_use',
      title: 'Caméra occupée ou inaccessible',
      message: 'La caméra semble déjà être utilisée par une autre application ou un autre onglet.',
      actionHint: 'Fermez les autres applications utilisant la caméra (Zoom, Teams, autre onglet) et réessayez.',
    };
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      type: 'unsupported',
      title: 'Configuration caméra non supportée',
      message: 'La résolution ou le mode demandé (caméra arrière) ne peut pas être satisfait par cet appareil.',
      actionHint: 'Nous allons basculer sur la caméra par défaut de votre système.',
    };
  }

  if (name === 'SecurityError' || !window.isSecureContext) {
    return {
      type: 'insecure_context',
      title: 'Connexion non sécurisée (HTTPS requis)',
      message: "L'API de caméra WebRTC exige obligatoirement une connexion chiffrée HTTPS pour protéger votre vie privée.",
      actionHint: "Accédez à cette application via une adresse HTTPS valide (ou localhost en développement local).",
    };
  }

  return {
    type: 'unknown',
    title: 'Erreur d’accès à la caméra',
    message: err?.message || 'Une erreur inattendue est survenue lors de l’initialisation de la caméra.',
    actionHint: 'Rechargez la page ou essayez le mode Démo / Simulation pour tester les filtres en direct.',
  };
}

/**
 * Safely stops all video tracks of a stream
 */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore track stop error
      }
    });
  } catch (err) {
    console.warn('Error stopping stream tracks', err);
  }
}

/**
 * Requests camera stream with responsive fallback
 */
export async function requestCameraStream(
  facingMode: CameraFacingMode
): Promise<MediaStream> {
  const support = checkCameraSupport();
  if (!support.supported) {
    const error = new Error(
      support.reason === 'insecure_context'
        ? 'HTTPS est requis pour accéder à la caméra'
        : 'API Caméra non supportée par ce navigateur'
    );
    error.name = support.reason === 'insecure_context' ? 'SecurityError' : 'NotSupportedError';
    throw error;
  }

  // 1. Try with preferred facingMode and optimal mobile resolution
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    });
  } catch (firstErr) {
    console.warn('Optimal camera constraint failed, retrying with basic constraints', firstErr);
    // 2. Fallback to basic facingMode
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
    } catch {
      // 3. Last fallback: any video device
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }
  }
}

/**
 * Checks if torch (flash) is supported on the active video track
 */
export function isTorchSupported(track: MediaStreamTrack | null): boolean {
  if (!track) return false;
  try {
    const capabilities = (track as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities?.();
    return !!capabilities?.torch;
  } catch {
    return false;
  }
}

/**
 * Toggles torch if supported
 */
export async function setTorchState(
  track: MediaStreamTrack | null,
  torchOn: boolean
): Promise<boolean> {
  if (!track || !isTorchSupported(track)) return false;
  try {
    await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
      advanced: [{ torch: torchOn }],
    });
    return true;
  } catch (err) {
    console.warn('Failed to toggle torch', err);
    return false;
  }
}
