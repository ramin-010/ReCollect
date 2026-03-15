import axiosInstance from '../utils/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EmailDraftParams {
    recipient: string;
    recipientName?: string;
    subject?: string;
    context: string;
    tone: 'professional' | 'casual' | 'friendly' | 'formal' | 'persuasive';
    instructions?: string;
    threadId?: string;
}

export interface EmailDraftResponse {
    draft: {
        subject: string;
        body: string;
        provider: string;
    };
}

export interface EmailSendParams {
    to: string;
    subject: string;
    htmlBody: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: File[];
}

export interface EmailMessage {
    id: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    messageId: string;
    snippet: string;
    body: string;
    labelIds: string[];
}

export interface EmailThreadData {
    _id: string;
    gmailThreadId: string;
    subject: string;
    recipient: string;
    status: string;
    messageCount: number;
    messages: EmailMessage[];
    createdAt: string;
    updatedAt: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────
export const emailApi = {
    // Gmail Connection
    connect: async () => {
        const { data } = await axiosInstance.post('/api/email/connect');
        return data;
    },

    handleCallback: async (code: string) => {
        const { data } = await axiosInstance.post('/api/email/callback', { code });
        return data;
    },

    getStatus: async () => {
        const { data } = await axiosInstance.get('/api/email/status');
        return data;
    },

    disconnect: async () => {
        const { data } = await axiosInstance.post('/api/email/disconnect');
        return data;
    },

    // AI Drafting
    generateDraft: async (params: EmailDraftParams): Promise<EmailDraftResponse> => {
        const { data } = await axiosInstance.post('/api/email/draft', params);
        return data;
    },

    // Send Email
    send: async (params: EmailSendParams) => {
        // Use FormData if there are attachments
        if (params.attachments && params.attachments.length > 0) {
            const formData = new FormData();
            formData.append('to', params.to);
            formData.append('subject', params.subject);
            formData.append('htmlBody', params.htmlBody);
            if (params.cc) formData.append('cc', params.cc);
            if (params.bcc) formData.append('bcc', params.bcc);
            if (params.threadId) formData.append('threadId', params.threadId);
            if (params.inReplyTo) formData.append('inReplyTo', params.inReplyTo);
            if (params.references) formData.append('references', params.references);
            for (const file of params.attachments) {
                formData.append('attachments', file);
            }
            const { data } = await axiosInstance.post('/api/email/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        } else {
            const { data } = await axiosInstance.post('/api/email/send', params);
            return data;
        }
    },

    // Threads
    getThreads: async () => {
        const { data } = await axiosInstance.get('/api/email/threads');
        return data;
    },

    getThreadDetail: async (threadId: string) => {
        const { data } = await axiosInstance.get(`/api/email/threads/${threadId}`);
        return data;
    },

    archiveThread: async (threadId: string) => {
        const { data } = await axiosInstance.patch(`/api/email/threads/${threadId}/archive`);
        return data;
    },
};
