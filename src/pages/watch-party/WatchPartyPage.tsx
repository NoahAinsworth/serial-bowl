import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plus, Users, Calendar, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CreatePartyDialog } from '@/components/watch-party/CreatePartyDialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function WatchPartyPage() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('watch_parties')
        .select(`
          *,
          host:host_id (handle, avatar_url),
          content:show_id (title, poster_url),
          members:watch_party_members (count)
        `)
        .or(`host_id.eq.${user.id},id.in.(select party_id from watch_party_members where user_id = '${user.id}')`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParties(data || []);
    } catch (error) {
      console.error('Error loading parties:', error);
      toast.error('Failed to load watch parties');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Watch Parties</h1>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Party
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading parties...</div>
      ) : parties.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Watch Parties</h3>
          <p className="text-muted-foreground mb-4">Create a party to watch shows with friends!</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Party
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {parties.map((party) => (
            <Card
              key={party.id}
              className="cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => navigate(`/watch-party/${party.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{party.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Hosted by @{party.host?.handle}
                    </CardDescription>
                  </div>
                  {party.content?.poster_url && (
                    <img
                      src={party.content.poster_url}
                      alt={party.content.title}
                      className="w-12 h-16 object-cover rounded ml-2"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    <span>S{party.current_season}:E{party.current_episode}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{party.members?.[0]?.count || 0} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDistanceToNow(new Date(party.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="mt-3">
                  {party.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePartyDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
