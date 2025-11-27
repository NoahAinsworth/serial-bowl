import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete?: (url: string) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

export function ProfilePictureUpload({ 
  currentAvatarUrl, 
  onUploadComplete,
}: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[ProfilePic] File select triggered');
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('[ProfilePic] No file selected');
      return;
    }
    
    if (!user) {
      console.error('[ProfilePic] No user found');
      toast({
        title: "Authentication error",
        description: "You must be logged in to upload a profile picture",
        variant: "destructive",
      });
      return;
    }

    console.log('[ProfilePic] File selected:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('[ProfilePic] Invalid file type:', file.type);
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('[ProfilePic] File too large:', file.size);
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create object URL for cropping
      console.log('[ProfilePic] Creating preview URL');
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setCropDialogOpen(true);
      console.log('[ProfilePic] Crop dialog opened');
    } catch (error) {
      console.error('[ProfilePic] Error creating preview:', error);
      toast({
        title: "Error",
        description: "Failed to preview image",
        variant: "destructive",
      });
    }
  };

  const handleCropSave = async () => {
    console.log('[ProfilePic] Crop save initiated');
    
    if (!imageToCrop) {
      console.error('[ProfilePic] No image to crop');
      return;
    }
    
    if (!croppedAreaPixels) {
      console.error('[ProfilePic] No crop area defined');
      return;
    }
    
    if (!user) {
      console.error('[ProfilePic] No user');
      toast({
        title: "Authentication error",
        description: "You must be logged in to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setCropDialogOpen(false);

    try {
      console.log('[ProfilePic] Cropping image...');
      // Get cropped image blob
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      console.log('[ProfilePic] Image cropped, blob size:', croppedBlob.size);

      // Create a unique file name with user ID in the path (required by RLS policy)
      const fileName = `${Date.now()}.jpeg`;
      const filePath = `${user.id}/${fileName}`;
      console.log('[ProfilePic] Uploading to:', filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('[ProfilePic] Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('[ProfilePic] Upload successful:', uploadData);

      // Get public URL with timestamp to prevent caching
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting parameter
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('[ProfilePic] Public URL generated:', avatarUrl);

      // Update profile with new avatar URL
      console.log('[ProfilePic] Updating profile...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('[ProfilePic] Profile update error:', updateError);
        throw updateError;
      }
      
      console.log('[ProfilePic] Profile updated successfully');

      setPreviewUrl(avatarUrl);
      onUploadComplete?.(avatarUrl);

      toast({
        title: "Success!",
        description: "Profile picture updated successfully",
      });
      
      // Clean up
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    } catch (error: any) {
      console.error('[ProfilePic] Upload failed - Full error:', error);
      console.error('[ProfilePic] Error details:', {
        message: error?.message,
        statusCode: error?.statusCode,
        name: error?.name,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
      });
      
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    setCropDialogOpen(false);
  };

  const handleClick = () => {
    console.log('[ProfilePic] Camera button clicked');
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  };

  return (
    <>
      <div className="relative inline-block">
        <Avatar className="h-24 w-24 cursor-pointer relative z-10" onClick={handleClick}>
          <AvatarImage src={previewUrl} alt="Profile picture" />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          
          <div className="relative h-96 bg-muted">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCropCancel}>
              Cancel
            </Button>
            <Button onClick={handleCropSave} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}