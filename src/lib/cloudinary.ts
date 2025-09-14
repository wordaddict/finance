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

export async function uploadToCloudinary(
  file: Buffer,
  folder: string = 'expense-receipts'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        max_bytes: 10 * 1024 * 1024, // 10MB limit
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            bytes: result.bytes,
          })
        } else {
          reject(new Error('Upload failed'))
        }
      }
    ).end(file)
  })
}

export function generateUploadSignature(folder: string = 'expense-receipts') {
  const timestamp = Math.round(new Date().getTime() / 1000)
  
  // Create the parameters object in the correct order for signing
  // Only include parameters that will be sent to Cloudinary
  const params = {
    folder,
    timestamp,
  }

  // Generate signature using only the parameters that will be sent to Cloudinary
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!)

  return {
    signature,
    timestamp,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    folder,
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
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  })
}
