import type { FilterType, FilterSettings } from './utils/filterEngine.ts';

export type CameraFacingMode = 'environment' | 'user';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'error'
  | 'simulation';

export type CameraErrorType =
  | 'permission_denied'
  | 'not_found'
  | 'in_use'
  | 'insecure_context'
  | 'unsupported'
  | 'unknown';

export interface CameraErrorInfo {
  type: CameraErrorType;
  title: string;
  message: string;
  actionHint: string;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  filterType: FilterType;
}

export type { FilterType, FilterSettings };
