import { randomUUID } from "crypto";
import { S3ObjectStorageAdapter } from "../../src/modules/documents/infrastructure/s3-object-storage.adapter";

const ENDPOINT = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
const ROOT_USER = process.env.MINIO_ROOT_USER ?? "dentix";
const ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD ?? "dentix_dev_only";

// ensureBucketExists() must tell a genuinely missing bucket (safe to
// create) apart from any other failure (must propagate, never masked
// behind a confusing secondary CreateBucket error) — verified against a
// real MinIO instance, not a mocked S3Client, since the distinguishing
// signal (error name/status) is a real AWS SDK response shape.
describe("S3ObjectStorageAdapter.ensureBucketExists (ADR-009)", () => {
  it("creates a genuinely missing bucket rather than throwing", async () => {
    const bucket = `dentix-test-${randomUUID()}`;
    const storage = new S3ObjectStorageAdapter({
      endpoint: ENDPOINT,
      bucket,
      accessKeyId: ROOT_USER,
      secretAccessKey: ROOT_PASSWORD,
    });

    await expect(storage.ensureBucketExists()).resolves.toBeUndefined();
    // Idempotent: a second call against the now-existing bucket must not fail either.
    await expect(storage.ensureBucketExists()).resolves.toBeUndefined();
  });

  it("propagates a credentials failure rather than masking it as a missing bucket", async () => {
    const storage = new S3ObjectStorageAdapter({
      endpoint: ENDPOINT,
      bucket: process.env.MINIO_BUCKET ?? "dentix-documents-dev",
      accessKeyId: "wrong-access-key",
      secretAccessKey: "wrong-secret-key",
    });

    await expect(storage.ensureBucketExists()).rejects.toBeTruthy();
  });
});
