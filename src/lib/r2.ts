import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

// --- Lazy singleton (mirrors src/lib/db/index.ts pattern) ---

const globalForR2 = globalThis as unknown as { __r2?: S3Client };

function getR2Client(): S3Client {
  if (globalForR2.__r2) return globalForR2.__r2;

  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID is not set");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  globalForR2.__r2 = client;
  return client;
}

function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME is not set");
  return b;
}

/** Upload a single object to R2 */
export async function r2Put(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Get an object from R2 as a streaming response. Returns null if not found. */
export async function r2Get(
  key: string
): Promise<{ body: ReadableStream; contentType?: string } | null> {
  try {
    const res = await getR2Client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    const stream = res.Body?.transformToWebStream();
    if (!stream) return null;
    return { body: stream, contentType: res.ContentType };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw err;
  }
}

/** Get an object from R2 as a Buffer (for HTML injection). Returns null if not found. */
export async function r2GetBuffer(key: string): Promise<Buffer | null> {
  try {
    const res = await getR2Client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw err;
  }
}

/** Check whether a key exists in R2 */
export async function r2Exists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

/** Delete all objects under a given prefix (e.g. "my-slug/") */
export async function r2DeletePrefix(prefix: string): Promise<void> {
  const client = getR2Client();
  let continuationToken: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents;
    if (objects && objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key })),
            Quiet: true,
          },
        })
      );
    }

    continuationToken = list.IsTruncated
      ? list.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
