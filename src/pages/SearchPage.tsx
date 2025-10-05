import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

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
          <div className="text-center text-muted-foreground py-12">
            Search for TV shows to discover and rate
          </div>
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <div className="text-center text-muted-foreground py-12">
            Find other TV enthusiasts
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
