import React from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface font-body">
      <TopBar />
      <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
