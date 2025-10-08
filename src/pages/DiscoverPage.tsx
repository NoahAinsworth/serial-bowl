import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { fetchPopularShows, fetchNewShows } from "@/lib/discoverData";
import { getDaily } from "@/lib/dailyCache";
import { ShowCard } from "@/lib/shows";
import { toast } from "sonner";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("browse");
  
  const [popularShows, setPopularShows] = useState<ShowCard[]>([]);
  const [newShows, setNewShows] = useState<ShowCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load initial data when tab changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    if (activeTab === "browse") {
      loadPopularShows(true);
    } else if (activeTab === "new") {
      loadNewShows(true);
    }
  }, [activeTab]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      if (activeTab === "browse") {
        loadPopularShows(false);
      } else if (activeTab === "new") {
        loadNewShows(false);
      }
    }
  }, [page]);

  async function loadPopularShows(reset: boolean) {
    setLoading(true);
    try {
      const data = await getDaily(`tvdb:popular`, () => 
        fetchPopularShows()
      );
      
      if (reset) {
        setPopularShows(data);
      } else {
        setPopularShows((prev) => [...prev, ...data]);
      }
      
      // Disable infinite scroll for now since we get all data at once
      setHasMore(false);
    } catch (error) {
      console.error("Error loading popular shows:", error);
      toast.error("Failed to load shows");
    } finally {
      setLoading(false);
    }
  }

  async function loadNewShows(reset: boolean) {
    setLoading(true);
    try {
      const data = await getDaily(`tvdb:new`, () => 
        fetchNewShows()
      );
      
      if (reset) {
        setNewShows(data);
      } else {
        setNewShows((prev) => [...prev, ...data]);
      }
      
      // Disable infinite scroll for now since we get all data at once
      setHasMore(false);
    } catch (error) {
      console.error("Error loading new shows:", error);
      toast.error("Failed to load shows");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl pb-20">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {popularShows.map((show) => (
              <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
            ))}
          </div>
          
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3]" />
              ))}
            </div>
          )}
          
          <div ref={observerTarget} className="h-4" />
        </TabsContent>

        <TabsContent value="users">
          <div className="text-center py-12 text-muted-foreground">
            User search coming soon
          </div>
        </TabsContent>

        <TabsContent value="new">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {newShows.map((show) => (
              <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
            ))}
          </div>
          
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3]" />
              ))}
            </div>
          )}
          
          <div ref={observerTarget} className="h-4" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShowCardComponent({ show, onClick }: { show: ShowCard; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer overflow-hidden group hover:ring-2 hover:ring-primary transition-all"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={show.posterUrl || "/placeholder.svg"}
          alt={show.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
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
