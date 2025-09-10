
/**
 * AppHeader - Navigation header for the application
 * Displays user info, navigation buttons, and signout functionality
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { User, LogOut, ArrowLeft, ArrowRight } from 'lucide-react'
import { getCurrentUser, logout } from '@/utils/auth'

/**
 * AppHeader component - Main application header
 */
export default function AppHeader(): JSX.Element {
  const currentUser = getCurrentUser()

  const handleSignOut = () => {
    logout()
    window.location.hash = '#/login'
  }

  const handleBack = () => {
    window.history.back()
  }

  const handleForward = () => {
    window.history.forward()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left side - Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleForward}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side - User info and signout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{currentUser?.username || 'Guest'}</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Signout
          </Button>
        </div>
      </div>
    </header>
  )
}
