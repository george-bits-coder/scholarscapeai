import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import session from "express-session";
import { randomUUID } from "crypto";

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_DATABASE_URL,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_DATABASE_URL) {
  throw new Error(
    "Missing Firebase environment variables. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_DATABASE_URL are set.",
  );
}

const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

const app = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
  databaseURL: FIREBASE_DATABASE_URL,
});

export const firebaseDatabase = getDatabase(app);
export const firebaseRootRef = firebaseDatabase.ref();

export function createFirebaseId(): string {
  return randomUUID();
}

export class FirebaseSessionStore extends session.Store {
  private sessionsRef: any;

  constructor(rootRef: any) {
    super();
    this.sessionsRef = rootRef.child("sessions");
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void) {
    this.sessionsRef
      .child(sid)
      .get()
      .then((snapshot: any) => {
        callback(null, snapshot.exists() ? snapshot.val() : null);
      })
      .catch((error: any) => callback(error));
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    this.sessionsRef
      .child(sid)
      .set(sessionData)
      .then(() => callback?.(null))
      .catch((error: any) => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    this.sessionsRef
      .child(sid)
      .remove()
      .then(() => callback?.(null))
      .catch((error: any) => callback?.(error));
  }

  touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    this.set(sid, sessionData, callback);
  }
}

function normalizeRecord<T extends Record<string, any>>(record: any, id: string): T & { id: string } {
  return { id, ...record } as T & { id: string };
}

export async function getValue<T>(path: string): Promise<T | null> {
  const snapshot = await firebaseRootRef.child(path).get();
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

function sanitizeForFirebase(value: any): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirebase(item));
  }

  const sanitized: any = {};
  for (const key of Object.keys(value)) {
    const child = sanitizeForFirebase(value[key]);
    if (child !== undefined) {
      sanitized[key] = child;
    }
  }
  return sanitized;
}

export async function setValue(path: string, value: any): Promise<void> {
  await firebaseRootRef.child(path).set(sanitizeForFirebase(value));
}

export async function updateValue(path: string, updates: any): Promise<void> {
  await firebaseRootRef.child(path).update(sanitizeForFirebase(updates));
}

export async function removeValue(path: string): Promise<void> {
  await firebaseRootRef.child(path).remove();
}

export async function listValues<T extends Record<string, any>>(path: string): Promise<Array<T & { id: string }>> {
  const snapshot = await firebaseRootRef.child(path).get();
  const data = snapshot.exists() ? snapshot.val() : null;
  if (!data || typeof data !== "object") {
    return [];
  }
  return Object.entries(data).map(([key, value]) => normalizeRecord<T>(value, key));
}

export async function queryValuesByChild<T extends Record<string, any>>(
  path: string,
  child: string,
  value: unknown,
): Promise<Array<T & { id: string }>> {
  const snapshot = await firebaseRootRef
    .child(path)
    .orderByChild(child)
    .equalTo(value as any)
    .get();

  const data = snapshot.exists() ? snapshot.val() : null;
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.entries(data).map(([key, item]) => normalizeRecord<T>(item, key));
}
