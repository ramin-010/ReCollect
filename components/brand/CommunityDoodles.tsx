'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// User-Selected Curated List + Expanded Lorelei Collection
export const AVATAR_COLLECTION = [
  // Original curated selection
  { style: 'notionists', seed: 'aneka', id: '1-2' },
  { style: 'notionists', seed: 'ole', id: '1-5' },
  { style: 'lorelei', seed: 'felix', id: '2-1' },
  { style: 'lorelei', seed: 'zack', id: '2-3' },
  { style: 'lorelei', seed: 'ole', id: '2-5' },
  { style: 'lorelei', seed: 'callie', id: '2-6' },
  { style: 'micah', seed: 'callie', id: '3-6' },
  { style: 'micah', seed: 'luna', id: '3-9' },
  { style: 'croodles', seed: 'felix', id: '6-1' },
  { style: 'croodles', seed: 'luna', id: '6-9' },
  { style: 'croodles', seed: 'leo', id: '6-10' },
  { style: 'croodles-neutral', seed: 'zack', id: '12-3' },
  { style: 'adventurer-neutral', seed: 'luna', id: '15-9' },
  { style: 'adventurer-neutral', seed: 'leo', id: '15-10' },
  { style: 'big-ears-neutral', seed: 'jia', id: '19-4' },
  { style: 'micah', seed: 'leo', id: '3-10' },
  { style: 'thumbs', seed: 'ole', id: '13-5' },
  { style: 'thumbs', seed: 'sam', id: '13-7' },
  { style: 'thumbs', seed: 'leo', id: '13-10' },
  // Expanded Lorelei Collection (36 avatars - batch 1)
  { style: 'lorelei', seed: 'aneka', id: 'L-1' },
  { style: 'lorelei', seed: 'bear', id: 'L-2' },
  { style: 'lorelei', seed: 'milo', id: 'L-3' },
  { style: 'lorelei', seed: 'luna', id: 'L-4' },
  { style: 'lorelei', seed: 'leo', id: 'L-5' },
  { style: 'lorelei', seed: 'jia', id: 'L-6' },
  { style: 'lorelei', seed: 'sam', id: 'L-7' },
  { style: 'lorelei', seed: 'alex', id: 'L-8' },
  { style: 'lorelei', seed: 'nova', id: 'L-9' },
  { style: 'lorelei', seed: 'kai', id: 'L-10' },
  { style: 'lorelei', seed: 'sage', id: 'L-11' },
  { style: 'lorelei', seed: 'river', id: 'L-12' },
  { style: 'lorelei', seed: 'quinn', id: 'L-13' },
  { style: 'lorelei', seed: 'skyler', id: 'L-14' },
  { style: 'lorelei', seed: 'charlie', id: 'L-15' },
  { style: 'lorelei', seed: 'jordan', id: 'L-16' },
  { style: 'lorelei', seed: 'taylor', id: 'L-17' },
  { style: 'lorelei', seed: 'casey', id: 'L-18' },
  { style: 'lorelei', seed: 'morgan', id: 'L-19' },
  { style: 'lorelei', seed: 'reese', id: 'L-20' },
  { style: 'lorelei', seed: 'avery', id: 'L-21' },
  { style: 'lorelei', seed: 'riley', id: 'L-22' },
  { style: 'lorelei', seed: 'drew', id: 'L-23' },
  { style: 'lorelei', seed: 'finley', id: 'L-24' },
  { style: 'lorelei', seed: 'hayden', id: 'L-25' },
  { style: 'lorelei', seed: 'cameron', id: 'L-26' },
  { style: 'lorelei', seed: 'emery', id: 'L-27' },
  { style: 'lorelei', seed: 'rowan', id: 'L-28' },
  { style: 'lorelei', seed: 'blake', id: 'L-29' },
  { style: 'lorelei', seed: 'eden', id: 'L-30' },
  { style: 'lorelei', seed: 'parker', id: 'L-31' },
  { style: 'lorelei', seed: 'phoenix', id: 'L-32' },
  { style: 'lorelei', seed: 'harley', id: 'L-33' },
  { style: 'lorelei', seed: 'dallas', id: 'L-34' },
  { style: 'lorelei', seed: 'devon', id: 'L-35' },
  { style: 'lorelei', seed: 'jamie', id: 'L-36' },
  // Lorelei batch 2 (64 more avatars)
  { style: 'lorelei', seed: 'max', id: 'L-37' },
  { style: 'lorelei', seed: 'oliver', id: 'L-38' },
  { style: 'lorelei', seed: 'emma', id: 'L-39' },
  { style: 'lorelei', seed: 'liam', id: 'L-40' },
  { style: 'lorelei', seed: 'ava', id: 'L-41' },
  { style: 'lorelei', seed: 'noah', id: 'L-42' },
  { style: 'lorelei', seed: 'sophia', id: 'L-43' },
  { style: 'lorelei', seed: 'ethan', id: 'L-44' },
  { style: 'lorelei', seed: 'mia', id: 'L-45' },
  { style: 'lorelei', seed: 'lucas', id: 'L-46' },
  { style: 'lorelei', seed: 'isabella', id: 'L-47' },
  { style: 'lorelei', seed: 'mason', id: 'L-48' },
  { style: 'lorelei', seed: 'amelia', id: 'L-49' },
  { style: 'lorelei', seed: 'logan', id: 'L-50' },
  { style: 'lorelei', seed: 'harper', id: 'L-51' },
  { style: 'lorelei', seed: 'jackson', id: 'L-52' },
  { style: 'lorelei', seed: 'evelyn', id: 'L-53' },
  { style: 'lorelei', seed: 'aiden', id: 'L-54' },
  { style: 'lorelei', seed: 'abigail', id: 'L-55' },
  { style: 'lorelei', seed: 'caden', id: 'L-56' },
  { style: 'lorelei', seed: 'ella', id: 'L-57' },
  { style: 'lorelei', seed: 'jayden', id: 'L-58' },
  { style: 'lorelei', seed: 'scarlett', id: 'L-59' },
  { style: 'lorelei', seed: 'grayson', id: 'L-60' },
  { style: 'lorelei', seed: 'aria', id: 'L-61' },
  { style: 'lorelei', seed: 'carter', id: 'L-62' },
  { style: 'lorelei', seed: 'zoey', id: 'L-63' },
  { style: 'lorelei', seed: 'dylan', id: 'L-64' },
  { style: 'lorelei', seed: 'penelope', id: 'L-65' },
  { style: 'lorelei', seed: 'luke', id: 'L-66' },
  { style: 'lorelei', seed: 'layla', id: 'L-67' },
  { style: 'lorelei', seed: 'gabriel', id: 'L-68' },
  { style: 'lorelei', seed: 'chloe', id: 'L-69' },
  { style: 'lorelei', seed: 'owen', id: 'L-70' },
  { style: 'lorelei', seed: 'lily', id: 'L-71' },
  { style: 'lorelei', seed: 'caleb', id: 'L-72' },
  { style: 'lorelei', seed: 'ellie', id: 'L-73' },
  { style: 'lorelei', seed: 'henry', id: 'L-74' },
  { style: 'lorelei', seed: 'violet', id: 'L-75' },
  { style: 'lorelei', seed: 'adam', id: 'L-76' },
  { style: 'lorelei', seed: 'aurora', id: 'L-77' },
  { style: 'lorelei', seed: 'jack', id: 'L-78' },
  { style: 'lorelei', seed: 'hazel', id: 'L-79' },
  { style: 'lorelei', seed: 'wyatt', id: 'L-80' },
  { style: 'lorelei', seed: 'lucy', id: 'L-81' },
  { style: 'lorelei', seed: 'daniel', id: 'L-82' },
  { style: 'lorelei', seed: 'nora', id: 'L-83' },
  { style: 'lorelei', seed: 'william', id: 'L-84' },
  { style: 'lorelei', seed: 'stella', id: 'L-85' },
  { style: 'lorelei', seed: 'sebastian', id: 'L-86' },
  { style: 'lorelei', seed: 'grace', id: 'L-87' },
  { style: 'lorelei', seed: 'matthew', id: 'L-88' },
  { style: 'lorelei', seed: 'zoe', id: 'L-89' },
  { style: 'lorelei', seed: 'james', id: 'L-90' },
  { style: 'lorelei', seed: 'hannah', id: 'L-91' },
  { style: 'lorelei', seed: 'benjamin', id: 'L-92' },
  { style: 'lorelei', seed: 'natalie', id: 'L-93' },
  { style: 'lorelei', seed: 'elijah', id: 'L-94' },
  { style: 'lorelei', seed: 'leah', id: 'L-95' },
  { style: 'lorelei', seed: 'ryan', id: 'L-96' },
];

export function CommunityDoodles({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-4 w-full max-w-4xl mx-auto my-8", className)}>
      {AVATAR_COLLECTION.map((item, i) => (
        <motion.div
            key={`${item.style}-${item.seed}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
                delay: i * 0.05, 
                type: "spring",
                stiffness: 260,
                damping: 20
            }}
            whileHover={{ 
                scale: 1.15, 
                zIndex: 10,
                rotate: Math.random() * 6 - 3
            }}
            className="relative z-0 group"
        >
            <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-black overflow-hidden shadow-sm group-hover:shadow-lg transition-all",
                "bg-[#f0f0f0]"
            )}>
               <img 
                 src={`https://api.dicebear.com/9.x/${item.style}/svg?seed=${item.seed}&backgroundColor=transparent`}
                 alt={`Community member ${item.seed}`}
                 className="w-full h-full object-cover transform scale-110 translate-y-1"
               />
            </div>
        </motion.div>
      ))}
    </div>
  );
}
