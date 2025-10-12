'use client'

import { Menu } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { SidebarTrigger } from './ui/sidebar'
import { CustomSidebarTrigger } from './app-sidebar'

// Hook per rilevare se siamo su tablet (iPad)
function useIsTablet() {
  const [isTablet, setIsTablet] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: 768px) and (max-width: 1279px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}

interface MobileHeaderProps {
  title: string
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title }) => {
  const isTablet = useIsTablet()
  
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 xl:hidden ">
      <div className="flex items-center gap-1 px-2">
        {isTablet ? (
          <CustomSidebarTrigger className="xl:hidden w-12 h-12" />
        ) : (
          <SidebarTrigger className="xl:hidden w-12 h-12" />
        )}
        <button
          aria-label="Toggle menu"
          className="-ml-1 p-0 m-0 bg-transparent border-none hover:bg-transparent focus:bg-transparent active:bg-transparent"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* <Menu className="ml-2 h-6 w-6" /> */}
        </button>
        <span className="mx-2 h-4 w-px bg-gray-300" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </header>
  )
}
