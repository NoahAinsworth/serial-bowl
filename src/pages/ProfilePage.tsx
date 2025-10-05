import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRatings } from '@/components/UserRatings';
import { UserThoughts } from '@/components/UserThoughts';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    handle: '@me',
    bio: '',
    avatar_url: '',
    showCount: 0,
    seasonCount: 0,
    episodeCount: 0,
    thoughtCount: 0,
    followers: 0,
    following: 0,
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

    const { data: profileData } = await supabase
      .from('profiles')
      .select('handle, bio, avatar_url')
      .eq('id', user.id)
      .single();

    // Get counts - use separate queries for each content type
    const { data: showRatings } = await supabase
      .from('ratings')
      .select('content_id')
      .eq('user_id', user.id);

    const { data: allContent } = await supabase
      .from('content')
      .select('id, kind');

    const contentMap = new Map(allContent?.map(c => [c.id, c.kind]));
    
    const showCount = showRatings?.filter(r => contentMap.get(r.content_id) === 'show').length || 0;
    const seasonCount = showRatings?.filter(r => contentMap.get(r.content_id) === 'season').length || 0;
    const episodeCount = showRatings?.filter(r => contentMap.get(r.content_id) === 'episode').length || 0;

    const { count: thoughtCount } = await supabase
      .from('thoughts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    setProfile({
      handle: profileData?.handle || '@me',
      bio: profileData?.bio || '',
      avatar_url: profileData?.avatar_url || '',
      showCount,
      seasonCount,
      episodeCount,
      thoughtCount: thoughtCount || 0,
      followers: followers || 0,
      following: following || 0,
    });

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
            <ProfilePictureUpload
              currentAvatarUrl={profile.avatar_url}
              onUploadComplete={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
            />
            <div>
              <h2 className="text-2xl font-bold">{profile.handle}</h2>
              <p className="text-muted-foreground mt-1">{profile.bio || 'TV enthusiast 📺'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.followers}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.following}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shows">Shows ({profile.showCount})</TabsTrigger>
          <TabsTrigger value="seasons">Seasons ({profile.seasonCount})</TabsTrigger>
          <TabsTrigger value="episodes">Eps ({profile.episodeCount})</TabsTrigger>
          <TabsTrigger value="thoughts">Thoughts ({profile.thoughtCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="shows" className="mt-4">
          <UserRatings userId={user?.id} contentKind="show" />
        </TabsContent>
        <TabsContent value="seasons" className="mt-4">
          <UserRatings userId={user?.id} contentKind="season" />
        </TabsContent>
        <TabsContent value="episodes" className="mt-4">
          <UserRatings userId={user?.id} contentKind="episode" />
        </TabsContent>
        <TabsContent value="thoughts" className="mt-4">
          <UserThoughts userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
