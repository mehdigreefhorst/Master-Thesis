'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get user info from storage or token
    // This is a placeholder - you might decode the JWT or fetch user info
    const email = 'user@example.com'; // TODO: Get actual user email from token
    setUserEmail(email);
  }, []);

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    // Redirect to login
    router.push('/login');
  };

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Account Settings" className="mb-6" />

        {/* User Info Card */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Email Address
              </label>
              <p className="text-base mt-1" style={{ color: 'var(--foreground)' }}>
                {userEmail}
              </p>
            </div>
          </div>
        </Card>

        {/* Actions Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Account Actions
          </h2>
          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={handleLogout}
              className="w-full"
            >
              Log Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
