import axiosInstance from './axios';

export interface CloudUploadResult {
    url: string;
    publicId: string;
    provider: string;
}

/**
 * Uploads file to backend -> Cloudinary -> Returns URL + metadata.
 * Pass docId for collab docs to track in cloudImages for cleanup.
 */
export async function uploadToCloud(file: File, docId?: string): Promise<CloudUploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (docId) {
        formData.append('docId', docId);
    }

    const response = await axiosInstance.post('/api/collab/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
    
    return {
        url: response.data.url,
        publicId: response.data.publicId,
        provider: response.data.provider,
    };
}
