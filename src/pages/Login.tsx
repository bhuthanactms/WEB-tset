/**
 * Login page - provides a simple username/password form with 4 demo accounts.
 * On successful login, redirects to the home page. Temporary solution before real auth.
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/utils/auth'
import { Lock, LogIn, Zap } from 'lucide-react'

/** Credentials form state */
interface LoginForm {
  username: string
  password: string
}

/**
 * Login component provides basic demo authentication.
 */
export default function Login() {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' })
  const [error, setError] = useState<string>('')

  /** Attempts login and redirects to home on success. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = login(form.username.trim(), form.password)
    if (!res.ok) {
      setError(res.message || 'Unable to login. Please try again.')
      return
    }
    window.location.hash = '#/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Visual panel */}
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-2xl shadow-lg border bg-white">
            <div className="aspect-[4/3] bg-slate-100">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                    <Zap className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">ENCHARG</h3>
                  <p className="text-blue-100">Ev Station Solutions</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-600 mt-1">
                Please sign in to continue.
              </p>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div>
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lock className="h-5 w-5" />
                Sign in
              </CardTitle>
              <CardDescription className="text-blue-100">
                Please sign in to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                    placeholder="e.g., admin"
                    className="mt-1 h-12 text-lg"
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    placeholder="Enter password"
                    className="mt-1 h-12 text-lg"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 text-lg font-semibold shadow-lg"
                  size="lg"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
