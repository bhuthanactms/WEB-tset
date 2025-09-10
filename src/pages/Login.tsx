/**
 * Login page - provides a simple username/password form with 4 demo accounts.
 * On successful login, redirects to the home page. Temporary solution before real auth.
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { login, getDemoUsers } from '@/utils/auth'
import { Lock, LogIn } from 'lucide-react'

/** Credentials form state */
interface LoginForm {
  username: string
  password: string
}

/**
 * Login component provides basic demo authentication.
 */
export default function Login(): JSX.Element {
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

  /** Quick-fill demo credentials. */
  const applyDemo = (u: string, p: string) => {
    setForm({ username: u, password: p })
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Visual panel */}
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-2xl shadow-lg border bg-white">
            <div className="aspect-[4/3] bg-slate-100">
              <img src="https://pub-cdn.sider.ai/u/U0GVH7W4264/web-coder/68ba39d638697d89a15e5601/resource/0cb57f62-7041-4ac3-9646-96ef2c90413d.jpg" className="object-cover w-full h-full" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-600 mt-1">
                Sign in with one of the demo accounts below and you can change them later.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {getDemoUsers().map((u) => (
                  <button
                    key={u.username}
                    onClick={() => applyDemo(u.username, u.password)}
                    className="group text-left p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition"
                    title="Click to autofill"
                  >
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">{u.username}</span>
                    </div>
                    <div className="text-xs text-gray-500">Password: {u.password}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <Badge className="bg-blue-600 text-white">Demo only</Badge>
              </div>
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
                Use one of the demo accounts. You can replace them later with real auth.
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

                <div className="text-xs text-gray-500 text-center">
                  Tip: click a demo account on the left to autofill.
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
