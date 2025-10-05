import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Loader2, Share2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRatings } from '@/components/UserRatings';
import { UserThoughts } from '@/components/UserThoughts';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    thoughtsCount: 0,
    followersCount: 0,
    followingCount: 0,
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
      .maybeSingle();

    // Get counts
    const [thoughtsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('thoughts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    setProfile(profileData);
    setStats({
      thoughtsCount: thoughtsRes.count || 0,
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
    });
    setLoading(false);
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/user/${user?.id}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Profile link copied!",
      description: "Share your profile with others",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      {/* DM Button - Top Left */}
      <div className="mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/messages')}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Messages
        </Button>
      </div>

      {/* Header Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24 rounded-lg">
            <AvatarImage src={profile?.avatar_url} alt={profile?.handle} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl rounded-lg">
              {profile?.handle?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold">{profile?.handle || 'Anonymous'}</h1>
                <p className="text-muted-foreground">@{profile?.handle || 'user'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleShare} title="Share profile">
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')}>
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm mb-4 text-foreground/80">{profile.bio}</p>
            )}

            {/* Counts Row */}
            <div className="flex gap-6 text-sm">
              <button 
                className="hover:underline"
                onClick={() => toast({ title: "Coming soon", description: "Thoughts list will be shown here" })}
              >
                <span className="font-bold">{stats.thoughtsCount}</span>{' '}
                <span className="text-muted-foreground">Posts</span>
              </button>
              <button 
                className="hover:underline"
                onClick={() => navigate('/followers')}
              >
                <span className="font-bold">{stats.followersCount}</span>{' '}
                <span className="text-muted-foreground">Followers</span>
              </button>
              <button 
                className="hover:underline"
                onClick={() => navigate('/following')}
              >
                <span className="font-bold">{stats.followingCount}</span>{' '}
                <span className="text-muted-foreground">Following</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Top 3 Shows Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Top 3 Shows</h2>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="aspect-[2/3] bg-muted rounded-lg mb-2 flex items-center justify-center">
                <span className="text-muted-foreground">#{i}</span>
              </div>
              <p className="text-xs text-muted-foreground">Coming Soon</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="thoughts">Thoughts</TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="mt-6">
          <UserRatings userId={user!.id} contentKind="show" />
        </TabsContent>

        <TabsContent value="seasons" className="mt-6">
          <UserRatings userId={user!.id} contentKind="season" />
        </TabsContent>

        <TabsContent value="episodes" className="mt-6">
          <UserRatings userId={user!.id} contentKind="episode" />
        </TabsContent>

        <TabsContent value="thoughts" className="mt-6">
          <UserThoughts userId={user!.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
