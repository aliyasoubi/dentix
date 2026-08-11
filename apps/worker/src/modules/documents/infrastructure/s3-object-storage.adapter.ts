import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ObjectStoragePort, UploadParams } from "../application/ports/object-storage.port";

export interface S3ObjectStorageConfig {
  readonly endpoint: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/** S3-compatible object storage (00-software-design-document.md) — MinIO in dev (ADR-009, 00-build-sequencing.md). */
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3ObjectStorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: "us-east-1", // MinIO ignores the region; the SDK still requires one.
      forcePathStyle: true, // MinIO addressing: bucket in the path, not a virtual-hosted subdomain.
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      // Only a genuinely missing bucket (404/NotFound) should fall
      // through to creating one. Anything else — bad credentials (403),
      // a network failure, an unreachable endpoint — must propagate as
      // itself: verified directly that a credentials error here has
      // name "Unknown"/status 403, not "NotFound", and swallowing it
      // would mask a clear auth failure behind a confusing secondary
      // CreateBucket error instead.
      if (!isBucketNotFound(error)) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async upload(params: UploadParams): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  async download(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error(`Object storage returned no body for key: ${key}`);
    }
    return Buffer.from(bytes);
  }
}

interface AwsSdkErrorShape {
  readonly name?: unknown;
  readonly $metadata?: { readonly httpStatusCode?: number };
}

function isBucketNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { name, $metadata } = error as AwsSdkErrorShape;
  return name === "NotFound" || name === "NoSuchBucket" || $metadata?.httpStatusCode === 404;
}
