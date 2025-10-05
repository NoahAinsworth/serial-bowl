import { Card } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Activity</h1>
      
      <div className="text-center text-muted-foreground py-12">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No new activity</p>
        <p className="text-sm mt-2">Your notifications will appear here</p>
      </div>
    </div>
  );
}
