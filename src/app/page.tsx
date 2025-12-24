import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Clock, Users, Heart, LogIn, Target, BookOpen, Send, Sparkles, Church } from 'lucide-react'

export default function LandingPage() {
  const campuses = [
    {
      name: 'Dallas',
      url: 'https://dallas.joincci.org/',
      location: 'Dallas, TX',
      serviceTime: 'Sundays at 10:00 AM CST',
      pastor: 'Pastor Opeyemi Olokede'
    },
    {
      name: 'DMV',
      url: 'https://dmv.joincci.org/',
      location: 'Riverdale, MD',
      serviceTime: 'Sundays at 10:00 AM EST',
      pastor: 'Pastor Ernest Olusanya'
    },
    {
      name: 'Boston',
      url: 'https://boston.joincci.org/',
      location: 'Cambridge, MA',
      serviceTime: 'Sundays at 10:00 AM EST',
      pastor: 'Pastor Dami Akinneye'
    },
    {
      name: 'Austin',
      url: 'https://austin.joincci.org/',
      location: 'Austin, TX',
      serviceTime: 'Sundays at 10:00 AM CST',
      pastor: 'Pastor Dami Akinneye'
    }
  ]

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
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent truncate">
                  CCI America
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Celebration Church International</p>
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
              <Link href="https://www.joincci.org" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button size="lg" className="flex items-center justify-center space-x-2 sm:space-x-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 px-6 sm:px-8 py-3 sm:py-4 rounded-full w-full sm:w-auto text-base sm:text-lg">
                  <Church className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="font-semibold">Visit Our Main Website</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-r from-red-50/50 via-orange-50/30 to-yellow-50/50 relative">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center px-2">
            <div className="flex justify-center mb-4 sm:mb-6">
              <Target className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-red-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent mb-6 sm:mb-8">
              Our Vision
            </h2>
            <div className="relative">
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-light text-gray-800 italic leading-relaxed">
                "To see people celebrate endless life in Christ and discover their purpose."
              </p>
              <div className="absolute -left-2 sm:-left-4 -top-2 sm:-top-4 text-red-200 text-4xl sm:text-5xl lg:text-6xl font-serif">"</div>
              <div className="absolute -right-2 sm:-right-4 -bottom-2 sm:-bottom-4 text-red-200 text-4xl sm:text-5xl lg:text-6xl font-serif">"</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-50/10 to-transparent"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-6xl mx-auto text-center px-2">
            <div className="flex justify-center mb-6 sm:mb-8">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-red-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-gray-900 bg-clip-text text-transparent mb-8 sm:mb-12">
              Our Mission
            </h2>
            <div className="mb-12 sm:mb-16">
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-gray-800 italic leading-relaxed">
                To enlist, to disciple and redeploy a people in Christ, for Christ with joy
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              <div className="group text-center transform transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-red-200/50 transition-shadow duration-300">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-red-600" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Evangelize</h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">Making disciples who become mature ministers of the gospel</p>
              </div>
              <div className="group text-center transform transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-green-200/50 transition-shadow duration-300">
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-green-600" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Know Christ</h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">Growing in the knowledge and expression of Christ</p>
              </div>
              <div className="group text-center transform transition-all duration-300 hover:scale-105 sm:col-span-2 lg:col-span-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-purple-200/50 transition-shadow duration-300">
                  <Send className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-purple-600" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Make Him Known</h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">Spreading the gospel through teaching and outreach</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campuses Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="flex justify-center mb-4 sm:mb-6">
              <MapPin className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-red-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-gray-900 bg-clip-text text-transparent mb-4 sm:mb-6">
              Our Campuses
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">Join us at any of our locations across America</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {campuses.map((campus, index) => (
              <Card key={campus.name} className="group hover:shadow-2xl hover:shadow-red-100/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 bg-white/80 backdrop-blur-sm border-red-100/20">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center space-x-2 sm:space-x-3 text-base sm:text-lg">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">CCI {campus.name}</span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base font-medium text-gray-700">
                    {campus.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-5">
                  <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                    <span className="font-medium">{campus.serviceTime}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 bg-red-50 p-2 sm:p-3 rounded-lg">
                    <strong className="text-red-700">Pastor:</strong> {campus.pastor}
                  </p>
                  <Link href={campus.url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-2 sm:py-3 rounded-xl text-sm sm:text-base">
                      Visit Website
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-6 sm:py-8 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
            <Image
              src="/logo.svg"
              alt="Celebration Church America"
              width={120}
              height={40}
              className="h-6 sm:h-8 w-auto brightness-0 invert"
            />
            <p className="text-xs text-gray-500 text-center px-2">
              © 2025 Celebration Church International. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
