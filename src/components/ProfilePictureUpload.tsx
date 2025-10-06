import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete?: (url: string) => void;
  bannerColor?: string;
  onBannerColorChange?: (color: string) => void;
}

const BANNER_COLORS = [
  'hsl(280, 100%, 70%)', // Purple
  'hsl(200, 100%, 70%)', // Blue
  'hsl(340, 100%, 70%)', // Pink
  'hsl(160, 100%, 70%)', // Teal
  'hsl(40, 100%, 70%)',  // Orange
  'hsl(120, 100%, 70%)', // Green
  'hsl(0, 100%, 70%)',   // Red
  'hsl(60, 100%, 70%)',  // Yellow
];

export function ProfilePictureUpload({ 
  currentAvatarUrl, 
  onUploadComplete,
  bannerColor = 'hsl(280, 100%, 70%)',
  onBannerColorChange 
}: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);
  const [selectedColor, setSelectedColor] = useState(bannerColor);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onUploadComplete?.(publicUrl);

      toast({
        title: "Success",
        description: "Profile picture updated!",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onBannerColorChange?.(color);
  };

  return (
    <div className="relative inline-block">
      {/* Polaroid Banner with Animated Grain */}
      <div 
        className="polaroid-banner"
        style={{ 
          '--banner-color': selectedColor 
        } as React.CSSProperties}
      >
        <Avatar className="h-24 w-24 cursor-pointer relative z-10" onClick={handleClick}>
          <AvatarImage src={previewUrl} alt="Profile picture" />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Avatar Camera Button */}
      <Button
        size="icon"
        variant="outline"
        className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background z-20"
        onClick={handleClick}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>

      {/* Banner Color Edit Button */}
      {onBannerColorChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="absolute top-0 right-0 rounded-full h-7 w-7 bg-background z-20"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Banner Color</p>
              <div className="grid grid-cols-4 gap-2">
                {BANNER_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full border-2 border-background shadow-md hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
}