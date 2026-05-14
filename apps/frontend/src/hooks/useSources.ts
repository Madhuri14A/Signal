import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export type Source = {
  id: number;
  name: string;
  url: string;
  niche: string | null;
  created_at: string;
};

export type SourcesByNiche = Record<string, Source[]>;

type SourcesResponse = {
  items: SourcesByNiche;
};

async function fetchSources(): Promise<SourcesByNiche> {
  const { data } = await client.get<SourcesResponse>('/api/sources');
  return data.items;
}

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: fetchSources,
  });
}
