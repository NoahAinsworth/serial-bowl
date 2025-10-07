import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DMsPage from './DMsPage';
import ActivityPage from './ActivityPage';

export default function MessagesPage() {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <DMsPage />
        </TabsContent>

        <TabsContent value="notifications">
          <ActivityPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
