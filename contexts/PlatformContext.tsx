import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { LibraryTrack, PlaylistCheckItem, EmailContact } from '../types';

const STORAGE_KEYS = {
  tracks: 'platform_library_tracks',
  checklist: 'platform_playlist_checklist',
  emails: 'platform_email_contacts',
} as const;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface PlatformContextValue {
  // ライブラリ
  tracks: LibraryTrack[];
  addTrack: (track: Omit<LibraryTrack, 'id' | 'createdAt'>) => void;
  updateTrack: (id: string, patch: Partial<LibraryTrack>) => void;
  removeTrack: (id: string) => void;

  // プレイリストチェック
  checklist: PlaylistCheckItem[];
  getChecksForTrack: (trackId: string) => PlaylistCheckItem[];
  addCheckItem: (item: Omit<PlaylistCheckItem, 'id' | 'checked' | 'checkedAt'>) => void;
  toggleCheck: (id: string) => void;
  setCheckItemPlaylistName: (id: string, playlistName: string) => void;
  removeCheckItem: (id: string) => void;

  // メール
  emailContacts: EmailContact[];
  addEmail: (email: string, name?: string) => void;
  removeEmail: (id: string) => void;
  updateEmail: (id: string, patch: Partial<Pick<EmailContact, 'email' | 'name'>>) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<LibraryTrack[]>(() =>
    loadJson<LibraryTrack[]>(STORAGE_KEYS.tracks, [])
  );
  const [checklist, setChecklist] = useState<PlaylistCheckItem[]>(() =>
    loadJson<PlaylistCheckItem[]>(STORAGE_KEYS.checklist, [])
  );
  const [emailContacts, setEmailContacts] = useState<EmailContact[]>(() =>
    loadJson<EmailContact[]>(STORAGE_KEYS.emails, [])
  );

  useEffect(() => {
    saveJson(STORAGE_KEYS.tracks, tracks);
  }, [tracks]);
  useEffect(() => {
    saveJson(STORAGE_KEYS.checklist, checklist);
  }, [checklist]);
  useEffect(() => {
    saveJson(STORAGE_KEYS.emails, emailContacts);
  }, [emailContacts]);

  const addTrack = useCallback((track: Omit<LibraryTrack, 'id' | 'createdAt'>) => {
    setTracks((prev) => [
      ...prev,
      {
        ...track,
        id: genId(),
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const updateTrack = useCallback((id: string, patch: Partial<LibraryTrack>) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setChecklist((prev) => prev.filter((c) => c.trackId !== id));
  }, []);

  const getChecksForTrack = useCallback(
    (trackId: string) => checklist.filter((c) => c.trackId === trackId),
    [checklist]
  );

  const addCheckItem = useCallback(
    (item: Omit<PlaylistCheckItem, 'id' | 'checked' | 'checkedAt'>) => {
      setChecklist((prev) => [
        ...prev,
        {
          ...item,
          id: genId(),
          checked: false,
          checkedAt: null,
        },
      ]);
    },
    []
  );

  const toggleCheck = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              checked: !c.checked,
              checkedAt: !c.checked ? new Date().toISOString() : null,
            }
          : c
      )
    );
  }, []);

  const setCheckItemPlaylistName = useCallback((id: string, playlistName: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, playlistName } : c))
    );
  }, []);

  const removeCheckItem = useCallback((id: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addEmail = useCallback((email: string, name = '') => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setEmailContacts((prev) => [
      ...prev,
      {
        id: genId(),
        email: trimmed,
        name: name.trim(),
        addedAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const removeEmail = useCallback((id: string) => {
    setEmailContacts((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEmail = useCallback(
    (id: string, patch: Partial<Pick<EmailContact, 'email' | 'name'>>) => {
      setEmailContacts((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const value: PlatformContextValue = {
    tracks,
    addTrack,
    updateTrack,
    removeTrack,
    checklist,
    getChecksForTrack,
    addCheckItem,
    toggleCheck,
    setCheckItemPlaylistName,
    removeCheckItem,
    emailContacts,
    addEmail,
    removeEmail,
    updateEmail,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
