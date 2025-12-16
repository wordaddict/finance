import { v2 as cloudinary } from 'cloudinary'
import { NextRequest } from 'next/server'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  format: string
  bytes: number
}

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  format: string
  bytes: number
  resource_type: string
  type?: string
  version?: number
}

// Enhanced PDF upload function with diagnostics
export async function uploadToCloudinary(
  file: Buffer,
  folder: string = 'expense-receipts',
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  const fileName = originalFileName || ''
  const isPdf = fileName.toLowerCase().endsWith('.pdf')

  const uploadOptions: any = {
    folder,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    max_bytes: 10 * 1024 * 1024, // 10MB limit
  }

  // For PDFs, use raw resource type to ensure proper delivery
  if (isPdf) {
    uploadOptions.resource_type = 'raw'
    uploadOptions.type = 'upload'
  } else {
    uploadOptions.resource_type = 'auto'
  }

  console.log('Cloudinary upload options:', {
    fileName,
    isPdf,
    resource_type: uploadOptions.resource_type,
    type: uploadOptions.type,
    folder
  })

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error)
          reject(error)
        } else if (result) {
          const uploadResult = {
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            resource_type: result.resource_type,
            type: result.type,
            version: result.version,
          }

          console.log('Cloudinary upload result:', {
            public_id: uploadResult.public_id,
            resource_type: uploadResult.resource_type,
            type: uploadResult.type,
            version: uploadResult.version,
            format: uploadResult.format,
            secure_url: uploadResult.secure_url
          })

          // Runtime check for PDF delivery settings
          if (isPdf && uploadResult.resource_type !== 'raw') {
            console.warn('⚠️ PDF uploaded but not stored as raw resource. Check Cloudinary Settings → Security → enable "PDF delivery"')
          }

          resolve(uploadResult)
        } else {
          reject(new Error('Upload failed'))
        }
      }
    ).end(file)
  })
}

// Helper to return the secure_url from upload result (no manual construction)
export function buildCloudinaryPdfUrlFromResult(result: CloudinaryUploadResult): string {
  // Always return the secure_url provided by Cloudinary
  return result.secure_url
}

// Helper to generate download URL with attachment flag
export function getCloudinaryDownloadUrl(secureUrl: string): string {
  // Insert fl_attachment after /upload/ to force download
  return secureUrl.replace('/upload/', '/upload/fl_attachment/')
}

// Helper to generate PDF preview URL (page 1 as JPG)
export function getPdfPreviewUrl(publicId: string, version?: number): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const versionParam = version ? `v${version}/` : ''
  return `https://res.cloudinary.com/${cloudName}/image/upload/${versionParam}pg_1,f_jpg/${publicId}.pdf`
}

export function generateUploadSignature(folder: string = 'expense-receipts', type?: 'upload') {
  const timestamp = Math.round(new Date().getTime() / 1000)

  // Only sign the parameters that will be sent in FormData
  const params: any = {
    folder,
    timestamp,
  }

  // Include type in signature if specified (only for PDFs)
  if (type) {
    params.type = type
  }

  // Generate signature using only the parameters that will be sent to Cloudinary
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!)

  return {
    signature,
    timestamp,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    folder,
    type,
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', error)
    // Don't throw - file deletion failure shouldn't break the app
  }
}

export function getCloudinaryUrl(publicId: string, options: any = {}) {
  // Determine resource type from publicId or options
  const resourceType = options.resource_type || (publicId.includes('/') ? 'raw' : 'image')

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    ...options,
  })
}
