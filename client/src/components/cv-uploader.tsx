import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CVUploaderProps {
  onUpload: (cvUrl: string) => void;
  currentCV?: string;
  className?: string;
}

export function CVUploader({ onUpload, currentCV, className }: CVUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PDF, DOC, or DOCX file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
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
      const cvUrl = uploadURL.split('?')[0]; // Remove query parameters
      onUpload(cvUrl);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('cv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload CV. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('cv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          CV/Resume {currentCV && <span className="text-green-600">(Currently uploaded)</span>}
        </label>
        
        <div className="flex items-center space-x-2">
          <input
            id="cv-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-cv-file"
          />
          
          <label
            htmlFor="cv-upload"
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Choose File</span>
          </label>
          
          {selectedFile && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-md">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">{selectedFile.name}</span>
              <button
                onClick={clearSelection}
                className="text-blue-600 hover:text-blue-800"
                data-testid="button-clear-cv"
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
              data-testid="button-upload-cv"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
        </div>
        
        {currentCV && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>CV uploaded successfully</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => window.open(currentCV, '_blank')}
              className="p-0 h-auto text-blue-600"
              data-testid="button-view-current-cv"
            >
              View Current CV
            </Button>
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          Supported formats: PDF, DOC, DOCX. Maximum size: 10MB
        </p>
      </div>
    </div>
  );
}