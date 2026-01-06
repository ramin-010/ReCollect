import axiosInstance from './axios';

export interface CloudUploadResult {
    url: string;
    publicId: string;
    provider: string;
    imageId: string;
}

export async function uploadToCloud(file: File, docId?: string, imageId?: string): Promise<CloudUploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (docId) {
        formData.append('docId', docId);
    }
    if (imageId) {
        formData.append('imageId', imageId);
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
        imageId: response.data.imageId || imageId ,
    };
}

