import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export type Signal = {
  id: number;
  label: string | null;
  summary: string | null;
  created_at: string;
  article_count: number;
};

export type SignalArticle = {
  id: number;
  title: string;
  url: string;
  image_url: string | null;
  source_name: string | null;
  published_at: string | null;
};

export type SignalDetail = {
  id: number;
  label: string | null;
  summary: string | null;
  velocity: number;
  created_at: string;
  article_count: number;
  articles: SignalArticle[];
};

type SignalsResponse = {
  items: Signal[];
  archived_items?: Signal[];
};

export type SignalsFeed = {
  active: Signal[];
  archived: Signal[];
};

async function fetchSignals(): Promise<SignalsFeed> {
  const { data } = await client.get<SignalsResponse>('/api/signals');
  return {
    active: data.items,
    archived: data.archived_items ?? [],
  };
}

async function fetchSignalDetail(signalId: number): Promise<SignalDetail> {
  const { data } = await client.get<SignalDetail>(`/api/signals/${signalId}`);
  return data;
}

export function useSignals() {
  return useQuery({
    queryKey: ['signals'],
    queryFn: fetchSignals,
  });
}

export function useSignalDetail(signalId: number) {
  return useQuery({
    queryKey: ['signal', signalId],
    queryFn: () => fetchSignalDetail(signalId),
    enabled: Number.isFinite(signalId) && signalId > 0,
  });
}
