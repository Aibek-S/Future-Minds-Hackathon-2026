"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X, ChevronRight, BookOpen } from "lucide-react";
import { clsx } from "clsx";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { searchService } from "@/lib/services/search";
import type { SearchMaterial } from "@/lib/types";

interface SearchBarProps {
  placeholder?: string;
  topicId?: string;
  className?: string;
}

export function SearchBar({ placeholder = "Поиск по материалам...", topicId, className }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setError(null);
    }
  }, [debouncedQuery]);

  const performSearch = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchService.search(q, topicId);
      setResults(data.materials.slice(0, 5));
    } catch (err) {
      setError("Ошибка поиска");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}${topicId ? `&topicId=${topicId}` : ""}`);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && results.length === 0 && !loading && !error && query.length >= 2) {
      setError("Ничего не найдено");
    }
  }, [isOpen, results, loading, error, query]);

  return (
    <div ref={wrapperRef} className={clsx("relative w-full max-w-xs", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.length >= 2) setIsOpen(true);
            }}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text hover:scale-110 transition-transform"
              aria-label="Очистить поиск"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </form>

      {isOpen && (results.length > 0 || loading || error) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-lg border border-border bg-surface shadow-pop p-2 max-h-96 overflow-y-auto"
        >
          {loading && (
            <div className="flex items-center justify-center py-4 text-text-3">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm">Ищем...</span>
            </div>
          )}

          {error && !loading && (
            <div className="py-4 px-3 text-center text-sm text-text-3">{error}</div>
          )}

          {results.map((material) => (
            <button
              key={material.id}
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query.trim())}&topicId=${material.topicId}`);
                setIsOpen(false);
              }}
              className="w-full text-left p-3 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-start gap-2">
                <BookOpen className="size-5 shrink-0 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-2 truncate">Тема: {material.topicId.slice(0, 8)}</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {Math.round(material.similarity * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-3 line-clamp-2">{material.content.slice(0, 150)}...</p>
                </div>
                <ChevronRight className="size-4 text-text-3 shrink-0" />
              </div>
            </button>
          ))}

          {results.length > 0 && (
            <button
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query.trim())}${topicId ? `&topicId=${topicId}` : ""}`);
                setIsOpen(false);
              }}
              className="w-full mt-2 px-3 py-2 text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Показать все результаты →
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}