import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Page moved',
  description: 'This page has moved.',
}

export default function WishlistPage() {
  redirect('/')
}
