import axiosInstance from './axios';

/**
 * UPLOAD UTILITY
 * 
 * Uploads file to backend -> UploadFly/Cloudinary -> Returns URL.
 * 
 * @param file - The file object to upload
 * @returns Promise<string> - The public URL of the uploaded image
 */
export async function uploadToCloud(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    console.log('Uploading image...');

    try {
        const response = await axiosInstance.post('/api/collab/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        
        return response.data.url;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}
