import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users, MessageSquare, Trophy, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PartyChatPanel } from '@/components/watch-party/PartyChatPanel';
import { PartyMembersPanel } from '@/components/watch-party/PartyMembersPanel';
import { toast } from 'sonner';

export default function WatchPartyRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadParty();
  }, [id]);

  const loadParty = async () => {
    try {
      const { data, error } = await supabase
        .from('watch_parties')
        .select(`
          *,
          host:host_id (handle, avatar_url),
          content:show_id (title, poster_url, external_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setParty(data);
    } catch (error) {
      console.error('Error loading party:', error);
      toast.error('Failed to load watch party');
      navigate('/watch-party');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (season: number, episode: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update member progress
      const { error: memberError } = await supabase
        .from('watch_party_members')
        .update({
          progress_season: season,
          progress_episode: episode
        })
        .eq('party_id', id)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Award binge points
      const { data: currentMember } = await supabase
        .from('watch_party_members')
        .select('binge_points_earned')
        .eq('party_id', id)
        .eq('user_id', user.id)
        .single();

      if (currentMember) {
        await supabase
          .from('watch_party_members')
          .update({
            binge_points_earned: (currentMember.binge_points_earned || 0) + 10
          })
          .eq('party_id', id)
          .eq('user_id', user.id);
      }

      // Update user's total binge points
      const { data: profile } = await supabase
        .from('profiles')
        .select('binge_points')
        .eq('id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            binge_points: (profile.binge_points || 0) + 10
          })
          .eq('id', user.id);
      }

      toast.success('Progress updated! +10 Binge Points');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!party) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Button variant="ghost" onClick={() => navigate('/watch-party')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Watch Parties
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{party.name}</h1>
          <p className="text-muted-foreground mt-1">
            Hosted by @{party.host?.handle}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          S{party.current_season}:E{party.current_episode}
        </Badge>
      </div>

      {party.content && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            {party.content.poster_url && (
              <img
                src={party.content.poster_url}
                alt={party.content.title}
                className="w-16 h-24 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{party.content.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Currently watching Season {party.current_season}, Episode {party.current_episode}
              </p>
            </div>
            <Button onClick={() => navigate(`/show/${party.content.external_id}`)}>
              View Show
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4 h-[600px]">
        <Card className="md:col-span-2">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex-1">
                <Trophy className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 mt-0">
              <PartyChatPanel partyId={id!} />
            </TabsContent>
            
            <TabsContent value="progress" className="flex-1 mt-0 p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Mark Episode as Watched</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateProgress(party.current_season, party.current_episode)}
                      variant="outline"
                    >
                      Current Episode (S{party.current_season}:E{party.current_episode})
                    </Button>
                    <Button
                      onClick={() => updateProgress(party.current_season, party.current_episode + 1)}
                    >
                      Next Episode
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 bg-secondary rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Keep watching to earn more Binge Points and compete with other members!
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <Card>
          <CardContent className="p-0 h-full">
            <div className="border-b p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="font-semibold">Members</h3>
              </div>
            </div>
            <PartyMembersPanel partyId={id!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
