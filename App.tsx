
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import { generateHuggingVideo } from './services/geminiService';
import type { UploadedImage } from './types';

const loadingMessages = [
    "Warming up the digital actors...",
    "Choreographing the embrace...",
    "Setting the scene for the animation...",
    "Rendering the initial frames...",
    "This can take a few minutes, please be patient.",
    "AI is composing the video sequence...",
    "Almost there, adding the final touches..."
];

const combineImages = (leftImgSrc: string, rightImgSrc: string): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
        const leftImage = new Image();
        const rightImage = new Image();
        let leftLoaded = false;
        let rightLoaded = false;

        const onBothLoaded = () => {
            if (leftLoaded && rightLoaded) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                
                const targetHeight = 720;
                const leftAspectRatio = leftImage.width / leftImage.height;
                const rightAspectRatio = rightImage.width / rightImage.height;

                const leftScaledWidth = targetHeight * leftAspectRatio;
                const rightScaledWidth = targetHeight * rightAspectRatio;

                canvas.width = leftScaledWidth + rightScaledWidth;
                canvas.height = targetHeight;
                
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.drawImage(leftImage, 0, 0, leftScaledWidth, targetHeight);
                ctx.drawImage(rightImage, leftScaledWidth, 0, rightScaledWidth, targetHeight);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64 = dataUrl.split(',')[1];
                resolve({ base64, mimeType: 'image/jpeg', dataUrl });
            }
        };

        leftImage.onload = () => { leftLoaded = true; onBothLoaded(); };
        leftImage.onerror = (err) => reject(new Error('Failed to load left image.'));
        rightImage.onload = () => { rightLoaded = true; onBothLoaded(); };
        rightImage.onerror = (err) => reject(new Error('Failed to load right image.'));

        leftImage.crossOrigin = "anonymous";
        rightImage.crossOrigin = "anonymous";
        leftImage.src = leftImgSrc;
        rightImage.src = rightImgSrc;
    });
};


const App: React.FC = () => {
    const [leftImage, setLeftImage] = useState<UploadedImage | null>(null);
    const [rightImage, setRightImage] = useState<UploadedImage | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            intervalRef.current = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 3000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLoading]);

    const handleGenerateVideo = useCallback(async () => {
        if (!leftImage || !rightImage) {
            setError("Please upload both images before generating.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);

        try {
            const combinedImage = await combineImages(leftImage.dataUrl, rightImage.dataUrl);
            const videoUrl = await generateHuggingVideo(combinedImage);
            setGeneratedVideoUrl(videoUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [leftImage, rightImage]);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        AI Hug Video Generator
                    </h1>
                    <p className="mt-4 text-lg text-gray-300">
                        Upload two images to create a video of one person hugging the other from behind.
                    </p>
                </header>

                <main className="bg-gray-800/50 rounded-xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-gray-700">
                    {!generatedVideoUrl && !isLoading && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <ImageUploader
                                    id="left-person"
                                    label="Person on Left (Stays still)"
                                    onImageUpload={setLeftImage}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                />
                                <ImageUploader
                                    id="right-person"
                                    label="Person on Right (Moves to hug)"
                                    onImageUpload={setRightImage}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                />
                            </div>
                            <div className="text-center">
                                <button
                                    onClick={handleGenerateVideo}
                                    disabled={!leftImage || !rightImage || isLoading}
                                    className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                                >
                                    {isLoading ? <><Spinner /> Generating...</> : "Generate Video"}
                                </button>
                            </div>
                        </>
                    )}

                    {isLoading && (
                        <div className="text-center p-8 flex flex-col items-center justify-center h-64">
                            <Spinner />
                            <p className="mt-4 text-xl font-semibold text-gray-200">{loadingMessage}</p>
                            <p className="mt-2 text-gray-400">Please keep this window open.</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                           <strong className="font-bold">Error: </strong>
                           <span className="block sm:inline">{error}</span>
                           <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                               <svg className="fill-current h-6 w-6 text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                           </button>
                        </div>
                    )}

                    {generatedVideoUrl && (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-4">Your Video is Ready!</h2>
                            <video
                                src={generatedVideoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full max-w-2xl mx-auto rounded-lg shadow-lg border border-gray-600"
                            />
                            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href={generatedVideoUrl}
                                    download="ai_hug_video.mp4"
                                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
                                >
                                    Download Video
                                </a>
                                <button
                                    onClick={() => {
                                        setGeneratedVideoUrl(null);
                                        setLeftImage(null);
                                        setRightImage(null);
                                        setError(null);
                                    }}
                                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-500 text-base font-medium rounded-md shadow-sm text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500"
                                >
                                    Create Another
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
