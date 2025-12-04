import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, History } from 'lucide-react';

interface BulkWatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episodeCount: number;
  onConfirmRecent: () => void;
  onConfirmPast: () => void;
}

export function BulkWatchConfirmDialog({
  open,
  onOpenChange,
  episodeCount,
  onConfirmRecent,
  onConfirmPast,
}: BulkWatchConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Did you watch these episodes recently?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            You're logging <span className="font-bold text-foreground">{episodeCount} episodes</span>.
            <br /><br />
            If you watched these recently, you'll earn Binge Points. If you're logging past watches for your history, they'll still count toward your Show Score.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmPast}
            className="bg-muted text-foreground hover:bg-muted/80 border border-border"
          >
            <History className="h-4 w-4 mr-2" />
            No, just history
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onConfirmRecent}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Clock className="h-4 w-4 mr-2" />
            Yes, recently watched
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
