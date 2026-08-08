import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
const firebasePrivateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
const firebasePrivateKey = firebasePrivateKeyRaw.replace(/\\n/g, "\n");

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage(
  firebaseProjectId && firebaseClientEmail && firebasePrivateKeyRaw
    ? {
        projectId: firebaseProjectId,
        credentials: {
          client_email: firebaseClientEmail,
          private_key: firebasePrivateKey,
        },
      }
    : {
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      },
);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    let pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    if (!pathsStr && process.env.FIREBASE_STORAGE_BUCKET) {
      pathsStr = `/${process.env.FIREBASE_STORAGE_BUCKET}/public`;
    }

    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    let dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir && process.env.FIREBASE_STORAGE_BUCKET) {
      dir = `/${process.env.FIREBASE_STORAGE_BUCKET}/private`;
    } else if (!dir && process.env.FIREBASE_PROJECT_ID) {
      dir = `/${process.env.FIREBASE_PROJECT_ID}.appspot.com/private`;
    }

    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }

    const tryFile = async (pathStr: string): Promise<File | null> => {
      const { bucketName, objectName } = parseObjectPath(pathStr);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      const [exists] = await objectFile.exists();
      return exists ? objectFile : null;
    };

    const objectEntityPath = `${entityDir}${entityId}`;
    const directFile = await tryFile(objectEntityPath);
    if (directFile) {
      return directFile;
    }

    const privateDirName = entityDir.replace(/\/+$/, "").split("/").pop() || "";
    if (privateDirName && entityId.startsWith(`${privateDirName}/`)) {
      const normalizedEntityPath = `${entityDir}${entityId.slice(privateDirName.length + 1)}`;
      const normalizedFile = await tryFile(normalizedEntityPath);
      if (normalizedFile) {
        return normalizedFile;
      }
    }

    throw new ObjectNotFoundError();
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const action = method === "PUT" ? "write" : method === "GET" ? "read" : method === "DELETE" ? "delete" : "read";
  const expires = Date.now() + ttlSec * 1000;
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  try {
    const [signedURL] = await file.getSignedUrl({
      version: "v4",
      action,
      expires,
    });
    return signedURL;
  } catch (error) {
    console.warn("GCS signed URL generation failed, falling back to Replit sidecar:", error);
  }

  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(expires).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit or configured Firebase storage credentials.`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}