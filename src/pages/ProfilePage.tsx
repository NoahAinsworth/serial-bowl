import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users } from 'lucide-react';

export default function ProfilePage() {
  const [profile] = useState({
    handle: '@me',
    bio: 'TV enthusiast & serial watcher 📺',
    showCount: 0,
    seasonCount: 0,
    episodeCount: 0,
    thoughtCount: 0,
    followers: 0,
    following: 0,
  });

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
              {profile.handle[1].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.handle}</h2>
              <p className="text-muted-foreground mt-1">{profile.bio}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.followers}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.following}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="thoughts">Thoughts</TabsTrigger>
        </TabsList>
        <TabsContent value="shows" className="mt-4">
          <div className="text-center text-muted-foreground py-12">
            No shows rated yet
          </div>
        </TabsContent>
        <TabsContent value="seasons" className="mt-4">
          <div className="text-center text-muted-foreground py-12">
            No seasons rated yet
          </div>
        </TabsContent>
        <TabsContent value="episodes" className="mt-4">
          <div className="text-center text-muted-foreground py-12">
            No episodes rated yet
          </div>
        </TabsContent>
        <TabsContent value="thoughts" className="mt-4">
          <div className="text-center text-muted-foreground py-12">
            No thoughts posted yet
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
