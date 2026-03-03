// =============================================================================
// AI Pre-Test Sample Decks
// =============================================================================
// These are hand-crafted SlideCanvasData objects that simulate what an AI
// might produce. Each covers a different topic with varied block types,
// layouts, connections, and styling.

import { SlideCanvasData } from '../core/types';

// ---------------------------------------------------------------------------
// Helper — deterministic IDs so we can reference them in connections
// ---------------------------------------------------------------------------
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, '0')}`;




// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE 4 — "The Architecture of Transformers" (7 slides - Highly Detailed VIP)
// ═══════════════════════════════════════════════════════════════════════════════

const premiumCard = 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl';
const glowCard = 'bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)] rounded-2xl';
const accentBlue = 'bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] rounded-2xl';
const accentPurple = 'bg-purple-500/10 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] rounded-2xl';
const accentAmber = 'bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] rounded-2xl';
const accentEmerald = 'bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] rounded-2xl';
const accentRose = 'bg-rose-500/10 backdrop-blur-xl border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)] rounded-2xl';

export const transformerArchitectureDeck: SlideCanvasData = {
  slides: [
    {
      slideId: id('tr-slide', 1),
      order: 0,
      title: 'The Transformer Architecture',
      connections: [],
    },
    {
      slideId: id('tr-slide', 2),
      order: 1,
      title: 'The Evolution of NLP',
      connections: [
        { id: id('tr-conn', 1), fromBlock: id('tr-blk', 4), fromSide: 'right', toBlock: id('tr-blk', 5), toSide: 'left', color: '#475569' },
        { id: id('tr-conn', 2), fromBlock: id('tr-blk', 5), fromSide: 'right', toBlock: id('tr-blk', 6), toSide: 'left', color: '#6366f1' },
      ],
    },
    {
      slideId: id('tr-slide', 3),
      order: 2,
      title: 'Self-Attention Mechanism (QKV)',
      connections: [
        { id: id('tr-conn', 3), fromBlock: id('tr-blk', 8), fromSide: 'bottom', toBlock: id('tr-blk', 11), toSide: 'top', color: '#f59e0b' },
        { id: id('tr-conn', 4), fromBlock: id('tr-blk', 9), fromSide: 'bottom', toBlock: id('tr-blk', 11), toSide: 'top', color: '#f43f5e' },
        { id: id('tr-conn', 5), fromBlock: id('tr-blk', 10), fromSide: 'bottom', toBlock: id('tr-blk', 12), toSide: 'top', color: '#3b82f6' },
        { id: id('tr-conn', 6), fromBlock: id('tr-blk', 11), fromSide: 'bottom', toBlock: id('tr-blk', 12), toSide: 'left', color: '#10b981' },
      ],
    },
    {
      slideId: id('tr-slide', 4),
      order: 3,
      title: 'Multi-Head Attention & Positional Encoding',
      connections: [
         { id: id('tr-conn', 10), fromBlock: id('tr-blk', 13), fromSide: 'bottom', toBlock: id('tr-blk', 14), toSide: 'top', color: '#ec4899' },
      ],
    },
    {
      slideId: id('tr-slide', 5),
      order: 4,
      title: 'Encoder vs Decoder Architectures',
      connections: [
        { id: id('tr-conn', 7), fromBlock: id('tr-blk', 17), fromSide: 'right', toBlock: id('tr-blk', 19), toSide: 'left', color: '#8b5cf6' },
        { id: id('tr-conn', 8), fromBlock: id('tr-blk', 18), fromSide: 'right', toBlock: id('tr-blk', 19), toSide: 'left', color: '#8b5cf6' },
        { id: id('tr-conn', 9), fromBlock: id('tr-blk', 19), fromSide: 'bottom', toBlock: id('tr-blk', 20), toSide: 'top', color: '#d946ef' },
      ],
    },
    {
      slideId: id('tr-slide', 6),
      order: 5,
      title: 'Implementation: Scaled Dot-Product in PyTorch',
      connections: [],
    },
    {
      slideId: id('tr-slide', 7),
      order: 6,
      connections: [],
    },
  ],
  blocks: [
    // ── Slide 1: Title ──
    {
      blockId: id('tr-blk', 1),
      slideId: id('tr-slide', 1),
      type: 'text',
      content: '# The Transformer Architecture\n\n## The Engine of Generative AI\n\nHow a 2017 paper by Google researchers titled *"Attention Is All You Need"* completely revolutionized Natural Language Processing, Computer Vision, and computational biology.',
      x: 80,
      y: 140,
      width: 580,
      height: 'auto',
      fontSize: 24,
      color: 'bg-transparent border-none', // Pure text popping against default empty slide
    },
    {
      blockId: id('tr-blk', 2),
      slideId: id('tr-slide', 1),
      type: 'image',
      content: '',
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1000&h=800&fit=crop',
      isUploaded: true,
      x: 720,
      y: 120, 
      width: 440,
      height: 'auto',
      color: 'rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.05)] border border-white/10 p-2 bg-white/5 backdrop-blur-md', // Premium image frame
    },
    {
      blockId: id('tr-blk', 3),
      slideId: id('tr-slide', 1),
      type: 'text',
      content: '### ✨ Core Concepts We Will Cover:\n\n1. **The Evolution** from RNNs to Transformers\n2. The Core **Multi-Head Self-Attention Mechanism**\n3. **Positional Encodings** (sine/cosine functions)\n4. **Encoders** (BERT) vs **Decoders** (GPT)\n5. A pure **PyTorch implementation** breakdown',
      x: 80,
      y: 480,
      width: 580,
      height: 'auto',
      fontSize: 18,
      color: glowCard,
    },

    // ── Slide 2: Evolution ──
    {
      blockId: id('tr-blk', 4),
      slideId: id('tr-slide', 2),
      type: 'text',
      content: '## 🔙 Pre-2014: Standard RNNs\n\nRecurrent Neural Networks processed text strictly sequentially (left-to-right).\n\n- **Pros:** Handled variable length sequences natively.\n- **Cons:** Suffered heavily from vanishing gradients. Completely impossible to parallelize training on GPUs because step $t$ must wait for step $t-1$.',
      x: 40,
      y: 180,
      width: 320,
      height: 'auto',
      fontSize: 16,
      color: premiumCard,
    },
    {
      blockId: id('tr-blk', 5),
      slideId: id('tr-slide', 2),
      type: 'text',
      content: '## 🔄 2014-2017: LSTMs & Seq2Seq\n\nLong Short-Term Memory networks fixed the immediate gradient issue using a complex cell state.\n\n- **Pros:** Retained longer context, enabling early translation models.\n- **Cons:** Still sequential. The entire meaning of a sentence had to be compressed into a single fixed-size bottleneck.',
      x: 430,
      y: 180,
      width: 340,
      height: 'auto',
      fontSize: 16,
      color: premiumCard,
    },
    {
      blockId: id('tr-blk', 6),
      slideId: id('tr-slide', 2),
      type: 'text',
      content: '## ✨ 2017: Transformers\n\nCompletely dropped recurrence in favor of highly parallel **Attention** mechanisms.\n\n- **Pros:** Massively parallelizable, enormous context windows (up to 2M tokens), scalable to trillions of parameters.\n- **Cons:** Quadratic complexity $O(N^2)$ w.r.t sequence length (historically).',
      x: 840,
      y: 160,
      width: 360,
      height: 'auto',
      fontSize: 17,
      color: glowCard,
    },

    // ── Slide 3: Self-Attention Mechanism ──
    {
      blockId: id('tr-blk', 7),
      slideId: id('tr-slide', 3),
      type: 'text',
      content: '### Real Contextual Understanding\nInstead of passing hidden states sequentially, every token computes an attention score against *every other token* simultaneously to determine syntactic and semantic relevance.',
      x: 60,
      y: 120,
      width: 1100,
      height: 'auto',
      fontSize: 20,
      color: premiumCard
    },
    {
      blockId: id('tr-blk', 8),
      slideId: id('tr-slide', 3),
      type: 'text',
      content: '## 🔍 Query (Q)\n\n**"What am I looking for?"**\n\n(e.g., "I am an adjective looking for my noun" or "I am a preposition looking for my object locus").',
      x: 60,
      y: 260,
      width: 320,
      height: 180,
      fontSize: 15,
      color: accentAmber,
    },
    {
      blockId: id('tr-blk', 9),
      slideId: id('tr-slide', 3),
      type: 'text',
      content: '## 🔑 Key (K)\n\n**"What do I have?"**\n\n(e.g., "I am a noun describing an animal" or "I am a verb describing motion across space").',
      x: 420,
      y: 260,
      width: 320,
      height: 180,
      fontSize: 15,
      color: accentRose,
    },
    {
      blockId: id('tr-blk', 10),
      slideId: id('tr-slide', 3),
      type: 'text',
      content: '## 📦 Value (V)\n\n**"What is my meaning?"**\n\nThe actual content/meaning representation of the token to be aggregated if the Query and Key strongly match.',
      x: 780,
      y: 260,
      width: 320,
      height: 180,
      fontSize: 15,
      color: accentBlue,
    },
    {
      blockId: id('tr-blk', 11),
      slideId: id('tr-slide', 3),
      type: 'text',
      content: '## 🧮 Dot Product (Q • Kᵀ)\n\nCalculate attention similarity scores. We scale by $1/\\sqrt{d_k}$ to prevent gradient vanishing, then apply a Softmax layer to normalize these into percentages ($[0,1]$).',
      x: 240,
      y: 520,
      width: 320,
      height: 'auto',
      fontSize: 15,
      color: premiumCard,
    },
    {
      blockId: id('tr-blk', 12),
      slideId: id('tr-slide', 3),
      type: 'text',
      content: '## 🎓 Final Output Matrix\n\nMultiply the normalized attention probabilities by the **Value ($V$)** matrix. Tokens that strongly attended to each other blend their semantic vectors together deeply.',
      x: 780,
      y: 520,
      width: 360,
      height: 'auto',
      fontSize: 16,
      color: accentEmerald,
    },

    // ── Slide 4: Multi-Head & Positional Encoding ──
    {
      blockId: id('tr-blk', 13),
      slideId: id('tr-slide', 4),
      type: 'text',
      content: '## 🧠 Multi-Head Attention\n\nWhy just look at the sentence in one way? Multi-Head Attention splits the $Q, K, V$ vectors into $h$ separate chunks or "heads" that can specialize.\n\n- **Head 1:** Focuses on grammar (subject/verb agreement)\n- **Head 2:** Focuses on noun-pronoun coreference\n- **Head 3:** Focuses on emotional sentiment/tone\n\nAll heads run completely in parallel and are concatenated at the very end.',
      x: 80,
      y: 140,
      width: 480,
      height: 'auto',
      fontSize: 17,
      color: accentPurple
    },
    {
      blockId: id('tr-blk', 14),
      slideId: id('tr-slide', 4),
      type: 'text',
      content: '## 📍 Positional Encodings\n\nBecause attention is parallel, the model has NO IDEA what order words are in. "Dog bites man" and "Man bites dog" look absolutely identical mathematically.\n\nWe fix this by injecting a continuous, interlocking sine/cosine wave pattern into the input embeddings. Every position $p$ has a completely unique geometric signature.',
      x: 80,
      y: 500,
      width: 480,
      height: 'auto',
      fontSize: 17,
      color: accentAmber
    },
    {
      blockId: id('tr-blk', 145),
      slideId: id('tr-slide', 4),
      type: 'image',
      content: '',
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop', 
      isUploaded: true,
      x: 620,
      y: 160,
      width: 520,
      height: 'auto',
      color: 'rounded-3xl shadow-2xl border border-white/10 p-2 bg-white/5',
    },

    // ── Slide 5: Encoder vs Decoder ──
    {
      blockId: id('tr-blk', 15),
      slideId: id('tr-slide', 5),
      type: 'text',
      content: '## 📥 The Encoder (Left Brain)\n\nThe Encoder reads the entire input context perfectly simultaneously.\n\n- Uses **Bidirectional** self-attention.\n- "She opened the bank vault." (Knows "bank" means financial institution because it can look entirely ahead to "vault").\n- Base for models like **BERT**. Best for sentiment analysis, search ranking, and categorization.',
      x: 60,
      y: 120,
      width: 480,
      height: 'auto',
      fontSize: 16,
      color: accentBlue,
    },
    {
      blockId: id('tr-blk', 16),
      slideId: id('tr-slide', 5),
      type: 'text',
      content: '## 📤 The Decoder (Right Brain)\n\nThe Decoder is strict: it generates output strictly token by token autonomously.\n\n- Uses **Masked / Unidirectional** attention.\n- During training, it is blocked from looking at future tokens using a strict lower-triangular masking matrix. It only looks at the past.\n- Base for **GPT-4, Claude, LLaMA**. Crucial for autoregressive text generation.',
      x: 680,
      y: 120,
      width: 480,
      height: 'auto',
      fontSize: 16,
      color: accentPurple,
    },
    {
      blockId: id('tr-blk', 17),
      slideId: id('tr-slide', 5),
      type: 'text',
      content: 'Context Vectors (K, V)',
      x: 320,
      y: 430,
      width: 220,
      height: 60,
      fontSize: 15,
      color: premiumCard,
    },
    {
      blockId: id('tr-blk', 18),
      slideId: id('tr-slide', 5),
      type: 'text',
      content: 'Previous Gen Outputs',
      x: 680,
      y: 430,
      width: 250,
      height: 60,
      fontSize: 15,
      color: premiumCard,
    },
    {
      blockId: id('tr-blk', 19),
      slideId: id('tr-slide', 5),
      type: 'text',
      content: '## 🔀 Cross-Attention Hub\n\nThis is where translation actually happens! The Decoder takes its own current state as the Query ($Q$), but looks up critical information using the Encoder\'s Key ($K$) and Value ($V$).',
      x: 420,
      y: 540,
      width: 380,
      height: 'auto',
      fontSize: 16,
      color: glowCard,
    },
    {
      blockId: id('tr-blk', 20),
      slideId: id('tr-slide', 5),
      type: 'text',
      content: 'Next Token Probability Output',
      x: 460,
      y: 720,
      width: 300,
      height: 60,
      fontSize: 17,
      color: accentEmerald,
    },

    // ── Slide 6: Code Example ──
    {
      blockId: id('tr-blk', 21),
      slideId: id('tr-slide', 6),
      type: 'text',
      content: '### Code: Scaled Dot-Product Attention in PyTorch\n\nThis concise function is the mathematical core powering virtually all modern Large Language Models.',
      x: 60,
      y: 120,
      width: 1100,
      height: 'auto',
      fontSize: 20,
      color: premiumCard
    },
    {
      blockId: id('tr-blk', 22),
      slideId: id('tr-slide', 6),
      type: 'code',
      content: `import torch\nimport torch.nn.functional as F\nimport math\n\ndef scaled_dot_product_attention(Q, K, V, mask=None):\n    """\n    Computes Scaled Dot-Product Attention.\n    """\n    d_k = Q.size(-1)\n    \n    # 1. Calculate unnormalized attention scores.\n    # Divide by sqrt(d_k) to prevent dot products from getting too large.\n    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)\n    \n    # 2. Prevent looking into the future (for Decoders)\n    if mask is not None:\n        scores = scores.masked_fill(mask == 0, -1e9)\n        \n    # 3. Convert scores into a normalized probability distribution\n    weights = F.softmax(scores, dim=-1)\n    \n    # 4. Multiply weights by Values to get Final Context Vector Aggregation\n    output = torch.matmul(weights, V)\n    \n    return output, weights`,
      x: 60,
      y: 220,
      width: 760,
      height: 480,
      language: 'python',
      color: 'shadow-2xl rounded-2xl overflow-hidden border border-white/10'
    },
    {
      blockId: id('tr-blk', 23),
      slideId: id('tr-slide', 6),
      type: 'image',
      content: '',
      url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&h=700&fit=crop', 
      isUploaded: true,
      x: 840,
      y: 220,
      width: 360,
      height: 'auto',
      color: 'rounded-3xl shadow-2xl border border-white/10 p-2 bg-white/5',
    }
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Registry — all samples in one place
// ═══════════════════════════════════════════════════════════════════════════════
export interface SampleDeckMeta {
  id: string;
  name: string;
  description: string;
  slideCount: number;
  blockCount: number;
  data: SlideCanvasData;
}

export const SAMPLE_DECKS: SampleDeckMeta[] = [

  {
    id: 'transformer-architecture',
    name: 'The Architecture of Transformers',
    description: 'A 7-slide highly detailed deep-dive into Modern AI. Explains Self-Attention, Encoders vs Decoders, and includes PyTorch implementation with complex flowchart connections.',
    slideCount: transformerArchitectureDeck.slides.filter(s => s.title).length,
    blockCount: transformerArchitectureDeck.blocks.length,
    data: transformerArchitectureDeck,
  }
];
