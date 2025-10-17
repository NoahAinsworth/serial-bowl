import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Edit2, Save, X } from "lucide-react";

interface AboutMeSectionProps {
  bio: string;
  onSave: (newBio: string) => Promise<void>;
  isOwner?: boolean;
}

export function AboutMeSection({ bio, onSave, isOwner = true }: AboutMeSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(bio);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(editValue);
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(bio);
    setIsEditing(false);
  };

  return (
    <Card className="p-6 bg-card/30 backdrop-blur-sm border-border/20 relative overflow-hidden group">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">About Me</h3>
          {isOwner && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 gap-1"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Add a short bio or what you're currently watching..."
              className="min-h-[80px] bg-background/50 border-border/30 resize-none"
              maxLength={200}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {bio || (isOwner ? "Add a short bio or what you're currently watching." : "No bio yet.")}
          </p>
        )}
      </div>
    </Card>
  );
}
