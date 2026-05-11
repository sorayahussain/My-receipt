import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, customData?: any) {
  const errInfo: FirestoreErrorInfo & { timestamp: string, customData?: any } = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path,
    customData
  }
  
  // Logging with clear structure for debugging
  console.group('🔥 Firestore Error Details');
  console.error('Message:', errInfo.error);
  console.error('Operation:', operationType);
  console.error('Path:', path);
  console.error('User UID:', errInfo.authInfo.userId);
  console.info('Full Context:', errInfo);
  if (customData) console.info('Custom Payload Data:', customData);
  console.groupEnd();

  throw new Error(JSON.stringify(errInfo));
}
