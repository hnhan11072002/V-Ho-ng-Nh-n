import { GoogleGenAI } from "@google/genai";
import type { UploadedImage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const pollOperation = async <T,>(operation: any): Promise<T> => {
    let result = operation;
    while (!result.done) {
        // FIX: Increased polling delay to 10000ms as per documentation recommendation.
        await new Promise(resolve => setTimeout(resolve, 10000));
        result = await ai.operations.getVideosOperation({ operation: result });
    }
    return result as T;
};

export const generateHuggingVideo = async (combinedImage: UploadedImage): Promise<string> => {
    try {
        const prompt = `From the provided image containing two people side-by-side, create a short video. In the video, the person on the right walks through the person on the left, moves behind them, and then hugs their waist from behind. The person on the left must remain completely still and stationary throughout the entire video. Do not duplicate or clone either person. Ensure the animation is smooth and realistic.`;

        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            image: {
                imageBytes: combinedImage.base64,
                mimeType: combinedImage.mimeType,
            },
            config: {
                numberOfVideos: 1,
            }
        });

        const finalOperation = await pollOperation<any>(operation);

        const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation failed: no download link provided.");
        }

        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred with the AI service: ${error.message}`);
        }
        throw new Error("An unknown error occurred during video generation.");
    }
};