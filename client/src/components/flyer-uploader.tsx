import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileImage, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FlyerUploaderProps {
  onUpload: (flyerUrl: string) => void;
  currentFlyer?: string;
  className?: string;
}

export function FlyerUploader({ onUpload, currentFlyer, className }: FlyerUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (Images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select an image file (JPEG, PNG, GIF, WebP) or PDF');
        return;
      }
      
      // Validate file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        alert('File size must be less than 15MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Get upload URL from server
      const response = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await response.json();

      // Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // The uploaded file URL
      const flyerUrl = uploadURL.split('?')[0]; // Remove query parameters
      onUpload(flyerUrl);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('flyer-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload flyer. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('flyer-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Project Flyer/Poster {currentFlyer && <span className="text-green-600">(Currently uploaded)</span>}
        </label>
        
        <div className="flex items-center space-x-2">
          <input
            id="flyer-upload"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-flyer-file"
          />
          
          <label
            htmlFor="flyer-upload"
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Choose File</span>
          </label>
          
          {selectedFile && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-md">
              <FileImage className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">{selectedFile.name}</span>
              <button
                onClick={clearSelection}
                className="text-blue-600 hover:text-blue-800"
                data-testid="button-clear-flyer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {selectedFile && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
              data-testid="button-upload-flyer"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
        </div>
        
        {currentFlyer && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileImage className="w-4 h-4" />
            <span>Flyer uploaded successfully</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => window.open(currentFlyer, '_blank')}
              className="p-0 h-auto text-blue-600"
              data-testid="button-view-current-flyer"
            >
              View Current Flyer
            </Button>
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          Supported formats: JPEG, PNG, GIF, WebP, PDF. Maximum size: 15MB
        </p>
      </div>
    </div>
  );
}