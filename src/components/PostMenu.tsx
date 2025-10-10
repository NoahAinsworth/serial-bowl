import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface PostMenuProps {
  postId: string;
  postType: 'thought' | 'review';
  authorHandle: string;
  textContent: string;
  onHide?: () => void;
}

export function PostMenu({ postId, postType, authorHandle, textContent, onHide }: PostMenuProps) {
  const navigate = useNavigate();

  const handleHidePost = () => {
    // Store hidden post in localStorage for client-side filtering
    const hiddenPosts = JSON.parse(localStorage.getItem('hiddenPosts') || '[]');
    hiddenPosts.push(postId);
    localStorage.setItem('hiddenPosts', JSON.stringify(hiddenPosts));
    
    toast({
      title: "Post hidden",
      description: "Refresh to see changes. Undo in Settings.",
      action: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const hidden = JSON.parse(localStorage.getItem('hiddenPosts') || '[]');
            const filtered = hidden.filter((id: string) => id !== postId);
            localStorage.setItem('hiddenPosts', JSON.stringify(filtered));
            toast({ title: "Post restored" });
            window.location.reload();
          }}
        >
          Undo
        </Button>
      ),
    });
    
    if (onHide) onHide();
  };

  const handleReport = () => {
    navigate('/settings/legal', {
      state: {
        reportUser: authorHandle,
        reportContent: textContent,
        openReport: true
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 touch-manipulation"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-[100] bg-popover">
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            handleHidePost();
          }}
          className="cursor-pointer touch-manipulation min-h-[44px]"
        >
          Hide Post
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            handleReport();
          }}
          className="cursor-pointer touch-manipulation min-h-[44px] text-destructive"
        >
          Report...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
