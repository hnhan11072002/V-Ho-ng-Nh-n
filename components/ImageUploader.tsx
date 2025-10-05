import React, { useState, useRef } from 'react';
import type { UploadedImage } from '../types';

interface ImageUploaderProps {
  id: string;
  label: string;
  onImageUpload: (image: UploadedImage | null) => void;
  // FIX: Used React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactElement;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, icon }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      onImageUpload(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, etc.).');
      setPreview(null);
      onImageUpload(null);
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setPreview(dataUrl);
      onImageUpload({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
      onImageUpload(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageUpload(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="mt-2 w-full max-w-sm h-64 flex justify-center items-center rounded-lg border-2 border-dashed border-gray-600 px-6 pt-5 pb-6 bg-gray-800 relative overflow-hidden group">
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleRemoveImage} className="text-white bg-red-600 hover:bg-red-700 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            {icon}
            <div className="mt-4 flex text-sm leading-6 text-gray-400">
              <label
                htmlFor={id}
                className="relative cursor-pointer rounded-md font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-indigo-300"
              >
                <span>Upload a file</span>
                <input ref={fileInputRef} id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
            <p className="text-xs leading-5 text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default ImageUploader;