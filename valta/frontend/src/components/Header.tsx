'use client'

import Logo from './Logo'

export default function Header() {
  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="bg-gray-900 p-3 rounded-lg">
              <Logo size={72} className="text-white" />
            </div>

            {/* Brand */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Valta
              </h1>
              <p className="text-xs text-gray-500">
                AI Finance Analyst for Startups
              </p>
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-900 font-medium">Demo User</p>
              <p className="text-xs text-gray-500">demo@valta.ai</p>
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">D</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}