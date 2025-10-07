import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTVDB } from '@/hooks/useTVDB';
import { BingeBotAI } from '@/components/BingeBotAI';
import { tvdbClient } from '@/services/tvdb';
import { useToast } from '@/hooks/use-toast';

interface TVDBShow {
  id: number;
  title: string;
  posterUrl: string | null;
  year: string | null;
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { search: searchTVDB } = useTVDB();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  
  // Browse tab state
  const [browseShows, setBrowseShows] = useState<TVDBShow[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseHasMore, setBrowseHasMore] = useState(true);
  
  // New tab state
  const [newShows, setNewShows] = useState<TVDBShow[]>([]);
  const [newLoading, setNewLoading] = useState(false);
  const [newPage, setNewPage] = useState(1);
  const [newHasMore, setNewHasMore] = useState(true);
  
  // User search state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Show search state
  const [showResults, setShowResults] = useState<any[]>([]);
  const [showsLoading, setShowsLoading] = useState(false);

  // BingeBot state
  const [showBingeBot, setShowBingeBot] = useState(false);
  const [botPrompt, setBotPrompt] = useState('');

  // Refs for infinite scroll
  const browseObserver = useRef<IntersectionObserver | null>(null);
  const newObserver = useRef<IntersectionObserver | null>(null);
  const browseEndRef = useRef<HTMLDivElement>(null);
  const newEndRef = useRef<HTMLDivElement>(null);

  // Load initial browse shows - only once
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  useEffect(() => {
    if (!initialLoadDone) {
      loadBrowseShows(1);
      setInitialLoadDone(true);
    }
  }, [initialLoadDone]);

  // Load new shows when tab is activated
  useEffect(() => {
    if (activeTab === 'new' && newShows.length === 0) {
      loadNewShows(1);
    }
  }, [activeTab]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        if (activeTab === 'users') {
          searchUsers(searchQuery);
        } else {
          searchShows(searchQuery);
        }
      } else {
        setShowResults([]);
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Set up infinite scroll for Browse tab
  useEffect(() => {
    if (browseObserver.current) browseObserver.current.disconnect();

    if (activeTab !== 'browse' || browseShows.length === 0) return;

    browseObserver.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !browseLoading && browseHasMore) {
        loadBrowseShows(browsePage + 1);
      }
    });

    if (browseEndRef.current) {
      browseObserver.current.observe(browseEndRef.current);
    }

    return () => {
      if (browseObserver.current) browseObserver.current.disconnect();
    };
  }, [browseLoading, browsePage, browseShows.length, activeTab, browseHasMore]);

  // Set up infinite scroll for New tab
  useEffect(() => {
    if (newObserver.current) newObserver.current.disconnect();

    if (activeTab !== 'new' || newShows.length === 0) return;

    newObserver.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !newLoading && newHasMore) {
        loadNewShows(newPage + 1);
      }
    });

    if (newEndRef.current) {
      newObserver.current.observe(newEndRef.current);
    }

    return () => {
      if (newObserver.current) newObserver.current.disconnect();
    };
  }, [newLoading, newPage, newShows.length, activeTab, newHasMore]);

  const loadBrowseShows = async (page: number) => {
    if (browseLoading || (!browseHasMore && page > 1)) return;

    setBrowseLoading(true);
    try {
      const trending = await tvdbClient.getTrending();
      const startIdx = (page - 1) * 20;
      const pageResults = trending.slice(startIdx, startIdx + 20);
      
      if (pageResults.length === 0) {
        setBrowseHasMore(false);
      } else {
        const shows: TVDBShow[] = pageResults.map((show: any) => ({
          id: show.id || show.tvdb_id,
          title: show.name || show.seriesName,
          posterUrl: show.image || show.image_url || null,
          year: show.year?.toString() || null,
        }));

        if (page === 1) {
          setBrowseShows(shows);
        } else {
          setBrowseShows(prev => [...prev, ...shows]);
        }
        setBrowsePage(page);
      }
    } catch (error) {
      console.error('Error loading browse shows:', error);
      toast({
        title: "Error",
        description: "Couldn't load shows. Please try again.",
        variant: "destructive",
      });
      setBrowseHasMore(false);
    } finally {
      setBrowseLoading(false);
    }
  };

  const loadNewShows = async (page: number) => {
    if (newLoading || !newHasMore) return;

    setNewLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const searchYear = currentYear - (page - 1);
      const results = await tvdbClient.searchShows(searchYear.toString());
      
      const recentShows = results
        .filter((show: any) => {
          const year = show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0];
          return year && parseInt(year) >= currentYear - 2;
        })
        .slice(0, 20);

      if (recentShows.length === 0) {
        setNewHasMore(false);
      } else {
        const shows: TVDBShow[] = recentShows.map((show: any) => ({
          id: show.tvdb_id || show.id,
          title: show.name,
          posterUrl: show.image_url || show.image || null,
          year: show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0] || null,
        }));

        if (page === 1) {
          setNewShows(shows);
        } else {
          setNewShows(prev => [...prev, ...shows]);
        }
        setNewPage(page);
      }
    } catch (error) {
      console.error('Error loading new shows:', error);
      toast({
        title: "Error",
        description: "Couldn't load shows. Please try again.",
        variant: "destructive",
      });
      setNewHasMore(false);
    }
    setNewLoading(false);
  };

  const searchShows = async (query: string) => {
    if (!query.trim()) {
      setShowResults([]);
      return;
    }

    setShowsLoading(true);
    try {
      const results = await searchTVDB(query);
      setShowResults(results);
    } catch (error) {
      console.error('Error searching shows:', error);
    }
    setShowsLoading(false);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setUsersLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url, settings')
        .or(`handle.ilike.%${query}%,settings->>displayName.ilike.%${query}%`)
        .limit(20);

      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
    setUsersLoading(false);
  };

  const ShowCard = ({ show }: { show: TVDBShow }) => (
    <Card 
      className="relative group overflow-hidden cursor-pointer hover:scale-105 transition-transform"
      onClick={() => navigate(`/show/${show.id}`)}
    >
      <div className="aspect-[2/3] bg-muted">
        {show.posterUrl ? (
          <img 
            src={show.posterUrl} 
            alt={show.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground">No poster</span>
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-white truncate">{show.title}</h3>
          {show.year && (
            <p className="text-xs text-white/80">{show.year}</p>
          )}
        </div>
      </div>
    </Card>
  );

  const UserCard = ({ user }: { user: any }) => {
    const displayName = user.settings?.displayName || user.handle;
    
    return (
      <Card 
        className="p-4 flex items-center gap-3 cursor-pointer hover:border-primary transition-colors"
        onClick={() => navigate(`/user/${user.handle}`)}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate">@{user.handle}</p>
        </div>
      </Card>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-4xl font-bold mb-6">Discover</h1>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={activeTab === 'users' ? 'Search users...' : 'Search shows...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse">
          {searchQuery.trim() ? (
            <div>
              {showsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : showResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {showResults.map((show) => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No shows found</p>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {browseShows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
              
              <div ref={browseEndRef} className="py-8">
                {browseLoading && (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {browseShows.length === 0 && !browseLoading && (
                <p className="text-center text-muted-foreground py-12">
                  No shows available.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length > 0 ? (
            <div className="grid gap-3 max-w-2xl mx-auto">
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <p className="text-center text-muted-foreground py-12">No users found</p>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Search for people to follow
            </p>
          )}
        </TabsContent>

        {/* New Tab */}
        <TabsContent value="new">
          {searchQuery.trim() ? (
            <div>
              {showsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : showResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {showResults.map((show) => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No shows found</p>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {newShows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
              
              <div ref={newEndRef} className="py-8">
                {newLoading && (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {newShows.length === 0 && !newLoading && (
                <p className="text-center text-muted-foreground py-12">
                  No new shows available.
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BingeBotAI 
        open={showBingeBot} 
        onOpenChange={setShowBingeBot}
        initialPrompt={botPrompt}
      />
    </div>
  );
}
