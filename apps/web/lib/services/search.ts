import { api } from "../api/client";
import type { SearchResult } from "../types";

export const searchService = {
  search(query: string, topicId?: string): Promise<SearchResult> {
    const params = new URLSearchParams({ query });
    if (topicId) params.set("topicId", topicId);
    return api.get<SearchResult>(`/materials/search?${params}`);
  },
};