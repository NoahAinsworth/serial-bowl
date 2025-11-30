import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { searchShows } from '@/api/tvdb';
import { contentFromTVDBResult } from '@/lib/contentResolver';

interface CreatePartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePartyDialog({ open, onOpenChange }: CreatePartyDialogProps) {
  const navigate = useNavigate();
  const [partyName, setPartyName] = useState('');
  const [showQuery, setShowQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!showQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await searchShows(showQuery);
      const formatted = results.map(r => ({
        tvdb_id: r.tvdbId,
        name: r.title,
        image_url: r.posterUrl,
        overview: r.overview,
        year: r.year
      }));
      setSearchResults(formatted.slice(0, 5));
    } catch (error) {
      toast.error('Failed to search shows');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateParty = async () => {
    if (!partyName.trim() || !selectedShow) {
      toast.error('Please enter a party name and select a show');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure show content exists
      const contentId = await contentFromTVDBResult(selectedShow);
      
      if (!contentId) {
        throw new Error('Failed to create show content');
      }

      // Create watch party
      const { data: party, error } = await supabase
        .from('watch_parties')
        .insert({
          host_id: user.id,
          name: partyName,
          show_id: contentId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as member
      await supabase.from('watch_party_members').insert({
        party_id: party.id,
        user_id: user.id,
        role: 'host'
      });

      toast.success('Watch party created!');
      onOpenChange(false);
      navigate(`/watch-party/${party.id}`);
    } catch (error) {
      console.error('Error creating party:', error);
      toast.error('Failed to create watch party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Watch Party</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="party-name">Party Name</Label>
            <Input
              id="party-name"
              placeholder="e.g., Breaking Bad Marathon"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="show-search">Search Show</Label>
            <div className="flex gap-2">
              <Input
                id="show-search"
                placeholder="Search for a show..."
                value={showQuery}
                onChange={(e) => setShowQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedShow && (
            <div className="p-3 bg-secondary rounded-lg flex items-center gap-3">
              {selectedShow.image_url && (
                <img src={selectedShow.image_url} alt={selectedShow.name} className="w-12 h-16 object-cover rounded" />
              )}
              <div className="flex-1">
                <p className="font-medium">{selectedShow.name}</p>
                <p className="text-sm text-muted-foreground">{selectedShow.year}</p>
              </div>
            </div>
          )}

          {searchResults.length > 0 && !selectedShow && (
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map((show) => (
                <button
                  key={show.tvdb_id}
                  onClick={() => {
                    setSelectedShow(show);
                    setSearchResults([]);
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                >
                  {show.image_url && (
                    <img src={show.image_url} alt={show.name} className="w-10 h-14 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{show.name}</p>
                    <p className="text-sm text-muted-foreground">{show.year}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Button onClick={handleCreateParty} disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Party'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
