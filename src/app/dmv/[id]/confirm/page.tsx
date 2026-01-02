import { notFound } from 'next/navigation'

export async function generateMetadata() {
  return {
    title: 'Not Found',
  }
}

export default async function ConfirmDonationPage() {
  notFound()
}
