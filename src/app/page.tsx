import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, Sparkles, Church } from 'lucide-react'

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-red-100/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-orange-100/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-96 sm:h-96 bg-red-50/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md shadow-lg border-b border-red-100/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <Image
                  src="/logo.svg"
                  alt="Celebration Church America"
                  width={120}
                  height={40}
                  className="h-8 sm:h-10 lg:h-12 w-auto transition-transform hover:scale-105"
                />
              </div>
            </div>
            <Link href="/login">
              <Button className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base px-3 sm:px-4 py-2">
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Login</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-50/20 to-transparent"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="relative">
                <Church className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-red-600 animate-pulse" />
                <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 text-yellow-500 animate-bounce" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-6 sm:mb-8 leading-tight animate-fade-in px-2">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent block sm:inline">
                Celebration Church International
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-700 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed font-light px-2">
              We believe fully in the death, burial, and resurrection of Christ, and in the saving power of the gospel.
              We are committed to knowing Christ and making Him known.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4">
              <Link href="https://usa.joincci.org" className="w-full sm:w-auto">
                <Button size="lg" className="flex items-center justify-center space-x-2 sm:space-x-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 px-6 sm:px-8 py-3 sm:py-4 rounded-full w-full sm:w-auto text-base sm:text-lg">
                  <Church className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="font-semibold">Visit Our Our Main USA Website</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
