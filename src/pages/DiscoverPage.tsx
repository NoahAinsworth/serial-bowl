import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchTrendingShows, fetchPopularShows, fetchNewShows } from '@/lib/discoverData';
import { getDaily } from '@/lib/dailyCache';
import { ShowCard } from '@/lib/shows';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BingeBotAI } from '@/components/BingeBotAI';

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'browse';

  const [searchQuery, setSearchQuery] = useState('');
  const [trending, setTrending] = useState<ShowCard[]>([]);
  const [popular, setPopular] = useState<ShowCard[]>([]);
  const [newShows, setNewShows] = useState<ShowCard[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Load Browse data (Trending + Popular)
  useEffect(() => {
    if (activeTab === 'browse' && !searchQuery) {
      loadBrowseData();
    }
  }, [activeTab, searchQuery]);

  // Load New data
  useEffect(() => {
    if (activeTab === 'new' && !searchQuery) {
      loadNewData();
    }
  }, [activeTab, searchQuery]);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(() => {
      if (activeTab === 'users') {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  async function loadBrowseData() {
    setLoading(true);
    try {
      const [trendingData, popularData] = await Promise.all([
        getDaily('tvdb:trending', () => fetchTrendingShows()),
        getDaily('tvdb:popular', () => fetchPopularShows({ pages: 2 }))
      ]);
      setTrending(trendingData);
      setPopular(popularData);
    } catch (error) {
      console.error('Error loading browse data:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoading(false);
    }
  }

  async function loadNewData() {
    setLoading(true);
    try {
      const data = await getDaily('tvdb:new', () => fetchNewShows());
      setNewShows(data);
    } catch (error) {
      console.error('Error loading new shows:', error);
      toast.error('Failed to load new shows');
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(query: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, bio, avatar_url')
        .ilike('handle', `%${query}%`)
        .limit(20);

      if (error) throw error;
      const results: UserResult[] = (data || []).map(profile => ({
        id: profile.id,
        username: profile.handle,
        display_name: profile.bio || profile.handle,
        avatar_url: profile.avatar_url
      }));
      setUserResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(value: string) {
    setSearchParams({ tab: value });
    setSearchQuery('');
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <h1 className="text-4xl font-bold mb-6">Discover</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder={activeTab === 'users' ? 'Search users...' : 'Search shows...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {searchQuery ? (
              <div className="text-center text-muted-foreground py-12">
                Search is only available in Users tab
              </div>
            ) : (
              <div className="space-y-8">
                {/* Trending Section */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Trending</h2>
                  {loading ? (
                    <LoadingSkeleton />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {trending.map((show) => (
                        <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Section */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Popular</h2>
                  {loading ? (
                    <LoadingSkeleton />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {popular.map((show) => (
                        <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {!searchQuery ? (
              <div className="text-center text-muted-foreground py-12">
                Start typing to search for users
              </div>
            ) : loading ? (
              <LoadingSkeleton />
            ) : userResults.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No users found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {userResults.map((user) => (
                  <UserCardComponent key={user.id} user={user} onClick={() => navigate(`/user/${user.username}`)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            {searchQuery ? (
              <div className="text-center text-muted-foreground py-12">
                Search is only available in Users tab
              </div>
            ) : loading ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {newShows.map((show) => (
                  <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BingeBotAI open={false} onOpenChange={() => {}} />
    </div>
  );
}

function ShowCardComponent({ show, onClick }: { show: ShowCard; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer overflow-hidden group"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={show.posterUrl || '/placeholder.svg'}
          alt={show.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-semibold text-white text-sm line-clamp-2">{show.title}</h3>
            {show.year && <p className="text-xs text-white/80">{show.year}</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function UserCardComponent({ user, onClick }: { user: UserResult; onClick: () => void }) {
  return (
    <Card
      className="p-4 cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.display_name || user.username}</p>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
        </div>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3]" />
      ))}
    </div>
  );
}
