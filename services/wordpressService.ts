
import { WPPost } from '../types';

export const fetchWordPressData = async (siteUrl: string): Promise<WPPost[]> => {
  // Normalize URL
  const baseUrl = siteUrl.replace(/\/+$/, '');
  const apiPaths = [
    `${baseUrl}/wp-json/wp/v2/posts?per_page=20`,
    `${baseUrl}/wp-json/wp/v2/pages?per_page=20`
  ];

  try {
    const responses = await Promise.all(
      apiPaths.map(path => fetch(path).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch from ${path}`);
        return res.json();
      }))
    );

    // Merge and return
    return responses.flat() as WPPost[];
  } catch (error) {
    console.error("WordPress API Error:", error);
    throw new Error("Could not connect to the WordPress site. Ensure the URL is correct and the REST API is enabled.");
  }
};
