import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown } from 'lucide-react';

interface PartyMembersPanelProps {
  partyId: string;
}

export function PartyMembersPanel({ partyId }: PartyMembersPanelProps) {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();

    // Subscribe to member changes
    const channel = supabase
      .channel(`party-members-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watch_party_members',
          filter: `party_id=eq.${partyId}`
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyId]);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('watch_party_members')
      .select(`
        *,
        profile:user_id (handle, avatar_url, binge_points)
      `)
      .eq('party_id', partyId)
      .order('binge_points_earned', { ascending: false });

    if (error) {
      console.error('Error loading members:', error);
      return;
    }

    setMembers(data || []);
  };

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-3">
        {members.map((member, index) => (
          <div key={member.user_id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.profile?.avatar_url} />
              <AvatarFallback>
                {member.profile?.handle?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">@{member.profile?.handle}</span>
                {member.role === 'host' && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                {index === 0 && member.binge_points_earned > 0 && (
                  <Trophy className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                S{member.progress_season}:E{member.progress_episode}
              </div>
            </div>

            <Badge variant="secondary">
              {member.binge_points_earned} pts
            </Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
