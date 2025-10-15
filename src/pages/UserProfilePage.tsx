import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!handle) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('handle', `@${handle.replace('@', '')}`)
        .maybeSingle();
      
      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, [handle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-center text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Button onClick={() => navigate(-1)} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback>{profile.handle?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile.handle}</h1>
            {profile.bio && (
              <p className="text-muted-foreground text-sm mt-1">{profile.bio}</p>
            )}
          </div>
        </div>
      </Card>

      <div className="text-center py-12 text-muted-foreground">
        <p>User profile ready for new functionality</p>
      </div>
    </div>
  );
}
