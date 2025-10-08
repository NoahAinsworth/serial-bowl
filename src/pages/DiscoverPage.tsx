import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Discover</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search shows or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="text-center py-12 text-muted-foreground">
            Browse content coming soon
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="text-center py-12 text-muted-foreground">
            User search coming soon
          </div>
        </TabsContent>

        <TabsContent value="new">
          <div className="text-center py-12 text-muted-foreground">
            New releases coming soon
          </div>
        </TabsContent>
      </Tabs>

      
    </div>
  );
}
