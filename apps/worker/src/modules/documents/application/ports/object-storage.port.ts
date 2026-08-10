export interface UploadParams {
  readonly key: string;
  readonly body: Buffer;
  readonly contentType: string;
}

/** S3-compatible object storage (ADR-009/00-software-design-document.md); MinIO in dev, per 07-plans/00-build-sequencing.md. */
export interface ObjectStoragePort {
  /** Idempotent — safe to call before every upload, not just once at process start. */
  ensureBucketExists(): Promise<void>;
  upload(params: UploadParams): Promise<void>;
  download(key: string): Promise<Buffer>;
}
