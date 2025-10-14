import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const DownloadSchema = () => {
  const handleDownload = async () => {
    try {
      const response = await fetch('/000_full_schema_dump.sql');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '000_full_schema_dump.sql';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Database Schema Export</h1>
        <p className="text-muted-foreground">Click below to download your full schema SQL file</p>
        <Button onClick={handleDownload} size="lg" className="gap-2">
          <Download className="h-5 w-5" />
          Download Schema SQL
        </Button>
      </div>
    </div>
  );
};

export default DownloadSchema;
