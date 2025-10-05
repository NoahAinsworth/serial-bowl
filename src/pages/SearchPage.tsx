import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { useTVDB } from '@/hooks/useTVDB';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { loading, search } = useTVDB();
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async () => {
    const results = await search(query);
    setSearchResults(results);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search shows or users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 btn-glow"
        />
      </div>

      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="shows" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((show) => (
                <Card
                  key={show.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/show/${show.id}`)}
                >
                  <div className="flex gap-4">
                    {show.image && (
                      <img
                        src={show.image}
                        alt={show.name}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{show.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {show.overview}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-center text-muted-foreground py-12">
              No shows found
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Search for TV shows to discover and rate
            </div>
          )}
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <div className="text-center text-muted-foreground py-12">
            User search coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
