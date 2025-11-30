import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface DraggableListItemProps {
  item: {
    id: string;
    title: string;
    posterUrl?: string;
    position: number;
    notes?: string;
  };
  onRemove: () => void;
  onNotesChange: (notes: string) => void;
  onClick: () => void;
}

export function DraggableListItem({ 
  item, 
  onRemove, 
  onNotesChange,
  onClick 
}: DraggableListItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 flex-shrink-0">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
        <span className="text-lg font-bold text-muted-foreground w-8 text-center">
          {item.position}
        </span>
      </div>

      <div 
        className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-muted cursor-pointer"
        onClick={onClick}
      >
        {item.posterUrl ? (
          <img 
            src={item.posterUrl} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 
          className="font-medium truncate cursor-pointer hover:text-primary"
          onClick={onClick}
        >
          {item.title}
        </h4>
        <Textarea
          placeholder="Add notes about this show..."
          value={item.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          className="mt-2 min-h-[60px]"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
