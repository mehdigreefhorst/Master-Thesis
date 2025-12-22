'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthFetch } from '@/utils/fetch';
import { userApi } from '@/lib/api';
import { UserProfile } from '@/types/user';
import { useToast } from '@/components/ui/use-toast';

export default function AccountPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [editedProfile, setEditedProfile] = useState<UserProfile>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profile = await userApi.getUserProfile(authFetch);
      setUserProfile(profile);
      setEditedProfile(profile);
      toast({
        title: "Success",
        description: "User profile loaded successfully",
        variant: "success"
      });
    } catch (err) {
      const errorMsg = 'Failed to load user profile';
      setError(errorMsg);
      console.error('Error loading user profile:', err);
      toast({
        title: "Error",
        description: `${errorMsg}: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await userApi.updateUserProfile(authFetch, editedProfile);
      setUserProfile(editedProfile);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      toast({
        title: "Success",
        description: "Profile updated successfully!",
        variant: "success"
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMsg = 'Failed to update profile';
      setError(errorMsg);
      console.error('Error updating profile:', err);
      toast({
        title: "Error",
        description: `${errorMsg}: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
    setError(null);
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="p-8 animate-[pageLoad_400ms_ease-out]">
        <div className="max-w-4xl mx-auto">
          <PageHeader title="Account Settings" className="mb-6" />
          <Card className="p-6">
            <p style={{ color: 'var(--muted-foreground)' }}>Loading profile...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Account Settings" className="mb-6" />

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 rounded-lg" style={{
            backgroundColor: 'var(--destructive)',
            color: 'var(--destructive-foreground)'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 rounded-lg" style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)'
          }}>
            {successMessage}
          </div>
        )}

        {/* Profile Information Card */}
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Profile Information
            </h2>
            {!isEditing && (
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedProfile.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="email@example.com"
                />
              ) : (
                <p className="text-base" style={{ color: 'var(--foreground)' }}>
                  {userProfile.email || 'Not set'}
                </p>
              )}
            </div>

            {/* Reddit Name */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Reddit Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.reddit_name || ''}
                  onChange={(e) => handleInputChange('reddit_name', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="your_reddit_username"
                />
              ) : (
                <p className="text-base" style={{ color: 'var(--foreground)' }}>
                  {userProfile.reddit_name || 'Not set'}
                </p>
              )}
            </div>

            {/* Reddit API Key */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Reddit API Key
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.reddit_api_key || ''}
                  onChange={(e) => handleInputChange('reddit_api_key', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="your_reddit_api_key"
                />
              ) : (
                <p className="text-base" style={{ color: 'var(--foreground)' }}>
                  {userProfile.reddit_api_key ? '••••••••••••••••' : 'Not set'}
                </p>
              )}
            </div>

            {/* Reddit Password */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Reddit Password
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.reddit_password || ''}
                  onChange={(e) => handleInputChange('reddit_password', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="your_reddit_password"
                />
              ) : (
                <p className="text-base" style={{ color: 'var(--foreground)' }}>
                  {userProfile.reddit_password ? '••••••••••••••••' : 'Not set'}
                </p>
              )}
            </div>

            {/* Reddit Client ID */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Reddit Client ID
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.reddit_client_id || ''}
                  onChange={(e) => handleInputChange('reddit_client_id', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="your_client_id"
                />
              ) : (
                <p className="text-base" style={{ color: 'var(--foreground)' }}>
                  {userProfile.reddit_client_id || 'Not set'}
                </p>
              )}
            </div>

            {/* OpenRouter API Key */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--muted-foreground)' }}>
                OpenRouter API Key
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.open_router_api_key || ''}
                  onChange={(e) => handleInputChange('open_router_api_key', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="your_openrouter_api_key"
                />
              ) : (
                <p className="text-base" style={{ color: 'var(--foreground)' }}>
                  {userProfile.open_router_api_key ? '••••••••••••••••' : 'Not set'}
                </p>
              )}
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>

        {/* Account Actions Card */}
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
