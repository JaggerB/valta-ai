'use client'

import React, { ReactNode } from 'react'

interface MainLayoutProps {
  sidebar?: ReactNode
  children: ReactNode
  rightPanel?: ReactNode
}

export default function MainLayout({ sidebar, children, rightPanel }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* Left Sidebar */}
      {sidebar && (
        <aside className="w-[240px] bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          {sidebar}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Right Panel */}
      {rightPanel && (
        <aside className="w-[320px] bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto">
          {rightPanel}
        </aside>
      )}
    </div>
  )
}
