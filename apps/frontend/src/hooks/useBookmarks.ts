import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export type BookmarkedSignal = {
  id: number;
  label: string | null;
  summary: string | null;
  velocity: number;
  created_at: string;
  article_count: number;
  bookmarked_at: string;
};

type BookmarksResponse = {
  items: BookmarkedSignal[];
};

async function fetchBookmarks(token: string): Promise<BookmarkedSignal[]> {
  const { data } = await client.get<BookmarksResponse>('/api/bookmarks', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.items;
}

export function useBookmarks(token: string | null) {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => fetchBookmarks(token as string),
    enabled: Boolean(token),
  });
}
