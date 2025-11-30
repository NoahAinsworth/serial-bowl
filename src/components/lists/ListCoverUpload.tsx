import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ListCoverUploadProps {
  currentCoverUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function ListCoverUpload({ currentCoverUrl, onUploadComplete }: ListCoverUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentCoverUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `list-covers/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
      toast.success('Cover uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload cover image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onUploadComplete('');
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">List Cover Image</label>
      
      {previewUrl ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
          <img 
            src={previewUrl} 
            alt="List cover" 
            className="w-full h-full object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
          <div className="flex flex-col items-center justify-center py-8">
            <Upload className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload cover image
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG up to 5MB
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
