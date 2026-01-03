// lib/utils/types.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  reminderEmail?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  _id: string;
  blockId: string;
  type: 'text' | 'image';
  x: string;
  y: string;
  width: string;
  height: string;
  content?: string;
  url?: string;
  imageId?: string;
  isUploaded?: boolean;
  createdAt: string;
  updatedAt: string;
  fontSize?: number;
  autoWidth?: boolean;
}

export interface Content {
  _id: string;
  user: string;
  title: string;
  body: Block[];
  tags: Tag[];
  links: string[];
  isPinned: boolean;
  isArchived: boolean;
  visibility: 'Public' | 'Private';
  createdAt: string;
  updatedAt: string;
  description?: string;
  DashId?: string; // Dashboard ID - populated in certain contexts like user settings
  reminderData?: {
    reminderDate: string;
    message?: string;
  };
}

export interface Dashboard {
  _id: string;
  name: string;
  description: string;
  user: string;
  contents?: Content[]; // Optional since we're lazy loading
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  _id: string;
  user: string;
  type: 'dashboard' | 'content';
  dashboard?: Dashboard;
  content?: Content;
  slug: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

export interface GetMeResponse {
  user: User;
  dashboards: Dashboard[]; // Dashboards without contents
}

export interface GetDashboardContentsResponse {
  contents: Content[];
}

export interface GetUserSettingsResponse {
  user: User;
  archivedNotes: Content[];
  favoriteNotes: Content[];
}

// Form Input Types
export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface DashboardInput {
  name: string;
  description?: string;
}

export interface ContentInput {
  title: string;
  body?: string;
  tags?: string[];
  links?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  visibility?: 'Public' | 'Private';
  DashId: string;
}