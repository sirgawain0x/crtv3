interface OrbisInsertResponse {
  success: boolean;
  error?: string;
  data?: any;
}

interface OrbisInsertError {
  index?: number; // For bulk inserts
  message: string;
  data?: any;
}

interface OrbisInsertBulkResponse {
  success: OrbisInsertResponse[];
  errors: OrbisInsertError[];
}

// Type for the form data structure
interface FormData {
  // Add your form fields here
  title: string;
  assetId: string;
  category: string;
  location: string;
  playbackId: string;
  description: string;
  subtitlesUri: string;
  thumbnailUri: string;
  // ... other fields
}

// Base interfaces for the database schema
interface VideoData {
  stream_id: string;
  controller: string;
  title: string;
  assetId: string;
  category?: string;
  location?: string;
  playbackId: string;
  description?: string;
  thumbnailUri?: string;
  subtitlesUri?: string;
}

interface UserData {
  stream_id: string;
  controller: string;
  address: string;
  token_name?: string;
  token_symbol?: string;
}

// Form data interfaces that match the schema
interface VideoFormData extends Omit<VideoData, 'stream_id' | 'controller'> {
  // stream_id and controller will be handled by the backend
}

interface UserFormData extends Omit<UserData, 'stream_id' | 'controller'> {
  // stream_id and controller will be handled by the backend
}

// Response types for Orbis operations
interface OrbisResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}
