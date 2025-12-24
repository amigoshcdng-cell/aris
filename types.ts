
export interface WPPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  type: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: WPPost[];
}

export interface WebsiteData {
  url: string;
  posts: WPPost[];
  isLoaded: boolean;
}

export type DisplayMode = 'widget' | 'inline';
