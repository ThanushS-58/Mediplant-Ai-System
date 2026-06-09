// Fix: Define and export all necessary types for the application.
// The original file had a circular dependency and was missing crucial type definitions.
export type Language = 'en-US' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'ml-IN';

export interface MedicinalUse {
  partUsed: string;
  uses: string[];
}

export interface PlantInfo {
  plantName: string;
  scientificName: string;
  commonNames: string[];
  confidenceScore: number;
  description: string;
  medicinalUses: MedicinalUse[];
  preparationMethods: string[];
  culturalSignificance: string;
  warnings: string;
  family?: string;
  origin?: string;
  image?: string;
}

// New types for Knowledge Base
export interface CommunityContribution {
    id: string; // Add unique ID for state management
    author: string;
    location: string;
    partUsed: string;
    medicinalUse: string;
    preparation: string;
    plantName?: string;
    status?: 'pending' | 'approved' | 'rejected';
    likes: number; // Add likes for individual contributions
    comments: Comment[]; // Add comments for individual contributions
}

export interface Comment {
    author: string;
    text: string;
    date: string;
}

export interface KnowledgeBasePlant {
    id: string;
    image: string; // URL to a high-quality image
    plantName: { [key in Language]: string };
    scientificName: string;
    commonNames: { [key in Language]: string[] };
    description: { [key in Language]: string };
    medicinalUses: {
        partUsed: { [key in Language]: string };
        uses: { [key in Language]: string[] };
    }[];
    preparationMethods: { [key in Language]: string[] };
    culturalSignificance: { [key in Language]: string };
    warnings: { [key in Language]: string };
    communityContributions: CommunityContribution[];
    likes: number;
    comments: Comment[];
}

// The user object available in the app state (no password)
export interface AuthenticatedUser {
    email: string;
    role: 'user' | 'admin';
}

// The user object stored in the DB (with password)
export interface User extends AuthenticatedUser {
    password: string;
}