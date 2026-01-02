import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Not Found',
  description: 'This page is no longer available.',
}

export default function ThankYouPage() {
  notFound()
}
