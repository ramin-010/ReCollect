'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Presentation, Trash2, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { SlideCanvas } from './core/SlideCanvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideDeck {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  content: string; // JSON string of SlideCanvasData
}

const STORAGE_KEY = 'recollect_slide_decks';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadDecks(): SlideDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SlideDeck[];
  } catch {
    return [];
  }
}

function saveDecks(decks: SlideDeck[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

// ---------------------------------------------------------------------------
// SlidesView — Top-level page
// ---------------------------------------------------------------------------

export function SlidesView() {
  const [decks, setDecks] = useState<SlideDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<SlideDeck | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load decks from localStorage on mount
  useEffect(() => {
    setDecks(loadDecks());
    setLoaded(true);
  }, []);

  // Persist whenever decks change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    saveDecks(decks);
  }, [decks, loaded]);

  // ---- Deck Operations ----
  const createDeck = useCallback(() => {
    const newDeck: SlideDeck = {
      id: uuidv4(),
      name: `Untitled Deck`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: '',
    };
    setDecks(prev => [newDeck, ...prev]);
    setActiveDeck(newDeck);
  }, []);

  const deleteDeck = useCallback((deckId: string) => {
    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeck?.id === deckId) setActiveDeck(null);
  }, [activeDeck]);

  const handleCanvasChange = useCallback((content: string) => {
    if (!activeDeck) return;
    setDecks(prev =>
      prev.map(d =>
        d.id === activeDeck.id
          ? { ...d, content, updatedAt: new Date().toISOString() }
          : d
      )
    );
  }, [activeDeck]);

  const handleRenameDeck = useCallback((deckId: string, name: string) => {
    setDecks(prev =>
      prev.map(d =>
        d.id === deckId ? { ...d, name, updatedAt: new Date().toISOString() } : d
      )
    );
    if (activeDeck?.id === deckId) {
      setActiveDeck(prev => prev ? { ...prev, name } : null);
    }
  }, [activeDeck]);

  // ---- If a deck is open, show the canvas ----
  if (activeDeck) {
    return (
      <div className="flex flex-col h-full w-full">
        {/* Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--divider))] bg-[hsl(var(--card-bg))]/50 backdrop-blur-sm shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveDeck(null)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={activeDeck.name}
              onChange={(e) => handleRenameDeck(activeDeck.id, e.target.value)}
              className="bg-transparent text-lg font-semibold text-[hsl(var(--foreground))] focus:outline-none w-full truncate"
              placeholder="Deck name..."
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <SlideCanvas
            initialContent={activeDeck.content}
            onChange={handleCanvasChange}
          />
        </div>
      </div>
    );
  }

  // ---- Deck List View ----
  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Presentation className="h-8 w-8 text-orange-500" />
              Slide Decks
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mt-2">
              Create and manage your slide presentations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={createDeck}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Deck
          </Button>
        </motion.div>

        {/* Deck Cards */}
        {decks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-xl"
          >
            <Presentation className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]/30" />
            <h3 className="text-lg font-semibold mb-2">No slide decks yet</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
              Create your first slide deck to start building presentations with blocks, connections, and more.
            </p>
            <Button
              variant="primary"
              onClick={createDeck}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Deck
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {decks.map((deck, index) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative bg-[hsl(var(--card-bg))] border border-[hsl(var(--border))] rounded-xl p-5 cursor-pointer hover:border-orange-500/40 hover:shadow-lg transition-all duration-200"
                  onClick={() => setActiveDeck(deck)}
                >
                  {/* Deck Icon */}
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                    <Presentation className="h-5 w-5 text-orange-500" />
                  </div>

                  {/* Deck Info */}
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1 truncate">
                    {deck.name || 'Untitled Deck'}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(deck.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeck(deck.id);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
