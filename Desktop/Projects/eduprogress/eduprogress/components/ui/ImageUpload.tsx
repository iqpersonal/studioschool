import React, { useState, ChangeEvent } from 'react';
import { app } from '../../services/firebase';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Label from './Label';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder: string;
  onUploadStateChange?: (isUploading: boolean) => void;
  initialPreview?: string | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadComplete, folder, onUploadStateChange, initialPreview }) => {
  const [preview, setPreview] = useState<string | null>(initialPreview || null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialPreview) {
      setPreview(initialPreview);
    }
  }, [initialPreview]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select a valid image file (e.g., PNG, JPEG).');
        setPreview(null);
        return;
      }
      setError(null);
      setPreview(URL.createObjectURL(selectedFile));
      handleUpload(selectedFile);
    }
  };

  const handleUpload = (fileToUpload: File) => {
    setUploading(true);
    onUploadStateChange?.(true);
    setProgress(0);

    const storage = getStorage(app);
    const filePath = `${folder}/${Date.now()}_${fileToUpload.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progressPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progressPercentage);
      },
      (err) => {
        console.error(err);
        setError('Upload failed. Please try again.');
        setUploading(false);
        onUploadStateChange?.(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setUploading(false);
          onUploadStateChange?.(false);
        }).catch((err) => {
          console.error("Error getting download URL:", err);
          setError('Upload succeeded, but failed to get file URL. Check storage permissions.');
          setUploading(false);
          onUploadStateChange?.(false);
        });
      }
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="logoUpload">School Logo (Optional)</Label>
      <div className="flex items-center space-x-4">
        {preview ? (
          <img src={preview} alt="School logo preview" className="w-16 h-16 rounded-md object-cover border" />
        ) : (
          <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <input
            type="file"
            id="logoUpload"
            accept="image/png, image/jpeg, image/gif"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary/10 file:text-primary
              dark:file:bg-primary/20 dark:file:text-primary-foreground
              hover:file:bg-primary/20"
            disabled={uploading}
          />
          {uploading && (
            <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          )}
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;