import { useState } from 'react'

import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar'

import { Header } from './Header'

import { CommandPalette } from '@/components/shared/CommandPalette'

import { RouteGuard } from '@/components/shared/RouteGuard'

import { useBranchScope } from '@/hooks/useAuth'

import { useAppStore } from '@/store/app-store'

import { cn } from '@/lib/utils'



export function AppShell() {

  const [searchOpen, setSearchOpen] = useState(false)

  const collapsed = useAppStore((s) => s.sidebarCollapsed)

  useBranchScope()



  return (

    <div className="min-h-screen overflow-x-hidden bg-background">

      <Sidebar />

      <div

        className={cn(

          'min-w-0 transition-all duration-300',

          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[220px]'

        )}

      >

        <Header onOpenSearch={() => setSearchOpen(true)} />

        <main className="min-w-0 p-4 lg:p-6">

          <RouteGuard>

            <Outlet />

          </RouteGuard>

        </main>

      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

    </div>

  )

}

