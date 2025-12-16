'use client'

import UserIcon from "@/components/icons/UserIcon";
import LockIcon from "@/components/icons/LockIcon";
import { LoginResponse, unauthFetch } from "@/utils/fetch";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getExpiry } from "@/utils/jwt_utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function Login() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter()

  useEffect(() => {
    // If the user is already logged-in, proceed immediately.
    const access_token = localStorage.getItem("access_token");
    const refresh_token = localStorage.getItem("refresh_token");

    if ((access_token && getExpiry(access_token) > new Date()) ||
      (refresh_token && getExpiry(refresh_token) > new Date())) {
      router.push("/overview");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await unauthFetch('/auth/login', {method: "POST", body: credentials})

      if (!res.ok) {
        setError("Login failed. Please check your credentials and try again.");
        return;
      }

      const response_body: LoginResponse = await res.json()
      localStorage.setItem("access_token", response_body.access_token)
      localStorage.setItem("refresh_token", response_body.refresh_token)

      router.push('/overview');

    } catch (error: unknown) {
      console.log(error)
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md animate-[pageLoad_0.5s_ease-out]">
        {/* Main login card */}
        <div
          className="rounded-lg p-8 border border-(--border)"
          style={{
            background: 'var(--card)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Welcome Back
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div
              className="mb-6 px-4 py-3 rounded border-2 animate-[insightAppear_0.3s_ease-out]"
              style={{
                background: 'oklch(0.98 0.03 25)',
                borderColor: 'var(--error)',
                color: 'var(--error)'
              }}
            >
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              icon={<UserIcon />}
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              disabled={isLoading}
              required
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              icon={<LockIcon />}
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full text-base font-semibold py-3"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Apply for access */}
        <div className="mt-6 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Don't have access yet?
          </p>
          <Button
            variant="invisible"
            onClick={() => window.location.href = 'mailto:mehdi.greefhorst@capero.ai'}
            className="text-base"
          >
            Apply for Access
          </Button>
        </div>
      </div>
    </div>
  )
}