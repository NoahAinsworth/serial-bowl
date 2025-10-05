import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut } from 'lucide-react';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';

export default function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    handle: '',
    bio: '',
    avatar_url: '',
    displayName: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('handle, bio, avatar_url, settings')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data) {
      const settings = data.settings as any;
      setProfile({
        handle: data.handle || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
        displayName: settings?.displayName || '',
      });
    } else {
      // Create profile if it doesn't exist
      const defaultHandle = `user${user.id.substring(0, 8)}`;
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          handle: defaultHandle,
          bio: '',
        });

      if (insertError) {
        toast({
          title: "Error",
          description: "Failed to create profile",
          variant: "destructive",
        });
      } else {
        setProfile({
          handle: defaultHandle,
          bio: '',
          avatar_url: '',
          displayName: '',
        });
        // Also create user role
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: 'user',
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate handle
    if (!profile.handle.trim()) {
      toast({
        title: "Error",
        description: "Handle cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    // Get current settings to preserve other data
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();
    
    const currentSettings = (currentProfile?.settings as any) || {};
    
    const { error } = await supabase
      .from('profiles')
      .update({
        handle: profile.handle.trim(),
        bio: profile.bio.trim(),
        settings: {
          ...currentSettings,
          displayName: profile.displayName.trim(),
        },
      })
      .eq('id', user.id);

    if (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      navigate('/profile');
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Edit Profile</h1>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <ProfilePictureUpload 
            currentAvatarUrl={profile.avatar_url}
            onUploadComplete={(url) => setProfile({ ...profile, avatar_url: url })}
          />
          <p className="text-sm text-muted-foreground">Click to change profile picture</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            placeholder="Your name"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            This is how your name will appear on your profile
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="handle">Username</Label>
          <Input
            id="handle"
            value={profile.handle}
            onChange={(e) => setProfile({ ...profile, handle: e.target.value })}
            placeholder="@yourhandle"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            className="resize-none"
            rows={4}
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground">
            {profile.bio.length} / 160
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-glow"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Account</h2>
        <Separator className="mb-4" />
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
