import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY;
const secretAccessKey = process.env.R2_SECRET_KEY;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Add it to .env.local — see .env.local.example.`
    );
  }
  return value;
}

let client: S3Client | null = null;

export function r2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID", accountId)}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY", accessKeyId),
      secretAccessKey: required("R2_SECRET_KEY", secretAccessKey),
    },
  });
  return client;
}

export function r2Bucket(): string {
  return required("R2_BUCKET", bucket);
}

export function r2PublicUrl(key: string): string {
  const base = required("R2_PUBLIC_URL", publicUrl).replace(/\/$/, "");
  return `${base}/${key}`;
}

export async function r2Upload(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return r2PublicUrl(key);
}
