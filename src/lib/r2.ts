import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 not configured. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function uploadToR2(base64: string, mimeType: string): Promise<string> {
  const client = getR2Client()
  const bucket = process.env.R2_BUCKET_NAME!
  const publicDomain = process.env.R2_PUBLIC_DOMAIN!

  const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const buffer = Buffer.from(base64, 'base64')

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: buffer,
    ContentType: mimeType || 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  return `${publicDomain}/${filename}`
}

export async function deleteFromR2(imageUrl: string): Promise<void> {
  const publicDomain = process.env.R2_PUBLIC_DOMAIN!
  const key = imageUrl.replace(`${publicDomain}/`, '')
  if (!key || key === imageUrl) return

  const client = getR2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
}
