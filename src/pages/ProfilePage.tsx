import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('handle, bio, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    setProfile(profileData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} alt={profile?.handle} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profile?.handle || 'My Profile'}</h2>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              {profile?.bio && (
                <p className="text-sm mt-2">{profile.bio}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        <Button onClick={() => navigate('/watchlist')} variant="outline" className="w-full">
          View Watchlist & Watched
        </Button>
        <Button onClick={() => navigate('/lists')} variant="outline" className="w-full">
          My Lists
        </Button>
        <Button onClick={() => navigate('/stats')} variant="outline" className="w-full">
          View Stats
        </Button>
        <Button onClick={() => navigate('/search')} variant="outline" className="w-full">
          Search TV Shows
        </Button>
        <Button onClick={() => navigate('/post')} className="w-full btn-glow">
          Create Post
        </Button>
      </div>
    </div>
  );
}
