'use client';

import React from 'react';
import { AVATAR_COLLECTION } from '@/components/brand/CommunityDoodles';

// Extended Lorelei seeds for browsing (100+ options)
const LORELEI_SEEDS = [
  // Row 1-20
  'felix', 'zack', 'ole', 'callie', 'aneka', 'bear', 'milo', 'luna', 'leo', 'jia',
  'sam', 'alex', 'nova', 'kai', 'sage', 'river', 'quinn', 'skyler', 'charlie', 'jordan',
  // Row 21-40
  'taylor', 'casey', 'morgan', 'reese', 'avery', 'riley', 'drew', 'finley', 'hayden', 'cameron',
  'emery', 'rowan', 'blake', 'eden', 'parker', 'phoenix', 'harley', 'dallas', 'devon', 'jamie',
  // Row 41-60
  'max', 'oliver', 'emma', 'liam', 'ava', 'noah', 'sophia', 'ethan', 'mia', 'lucas',
  'isabella', 'mason', 'amelia', 'logan', 'harper', 'jackson', 'evelyn', 'aiden', 'abigail', 'caden',
  // Row 61-80
  'ella', 'jayden', 'scarlett', 'grayson', 'aria', 'carter', 'zoey', 'dylan', 'penelope', 'luke',
  'layla', 'gabriel', 'chloe', 'owen', 'lily', 'caleb', 'ellie', 'henry', 'violet', 'adam',
  // Row 81-100
  'aurora', 'jack', 'hazel', 'wyatt', 'lucy', 'daniel', 'nora', 'william', 'stella', 'sebastian',
  'grace', 'matthew', 'zoe', 'james', 'hannah', 'benjamin', 'natalie', 'elijah', 'leah', 'ryan'
];

export default function DoodlesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <h1 className="text-3xl font-bold mb-4 text-center">Available Doodles Reference</h1>
      <p className="text-center text-gray-400 mb-8">Pick a number/ID to use in the design.</p>
      
      {/* Current Collection */}
      <h2 className="text-xl font-bold mb-4 text-emerald-400">Current Collection (AVATAR_COLLECTION)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-6 max-w-7xl mx-auto mb-16">
        {AVATAR_COLLECTION.map((avatar, index) => (
          <div key={index} className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-20 h-20 rounded-full bg-white border-2 border-white/20 overflow-hidden mb-3 shadow-lg relative">
               <img 
                  src={`https://api.dicebear.com/9.x/${avatar.style}/svg?seed=${avatar.seed}&backgroundColor=transparent`}
                  alt={`Avatar ${index}`}
                  className="w-full h-full object-cover scale-125 translate-y-2"
                />
                 <span className="absolute top-0 right-0 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-bl-md font-mono">
                    {index}
                </span>
            </div>
            <div className="text-center w-full">
                <div className="text-lg font-bold text-emerald-400 font-mono">#{index}</div>
                <div className="text-[10px] text-gray-500 uppercase">{avatar.style} / {avatar.seed}</div>
            </div>
          </div>
        ))}
      </div>

      {/* LORELEI EXPANDED GALLERY */}
      <h2 className="text-xl font-bold mb-4 text-blue-400">🎨 Lorelei Expanded Gallery (40 Options)</h2>
      <p className="text-center text-gray-500 mb-6 text-sm">Tell me the seed name (e.g., "lorelei/nova") to add it.</p>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-4 max-w-7xl mx-auto">
        {LORELEI_SEEDS.map((seed, index) => (
          <div key={seed} className="flex flex-col items-center p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-white border-2 border-blue-500/20 overflow-hidden shadow-md group-hover:scale-110 transition-transform">
               <img 
                  src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=transparent`}
                  alt={seed}
                  className="w-full h-full object-cover scale-125 translate-y-2"
                />
            </div>
            <div className="text-[10px] text-blue-300 mt-2 font-mono truncate w-full text-center">{seed}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
