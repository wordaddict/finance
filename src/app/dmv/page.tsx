import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Building Move Wish List - CCI DMV',
  description: 'Help us prepare for our new building by donating needed items. Every contribution makes a difference!',
}

export default function WishlistPage() {
  redirect('/')
}
