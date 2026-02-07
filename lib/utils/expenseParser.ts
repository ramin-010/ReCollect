import { startOfYesterday, subDays, parseISO } from 'date-fns';

export interface ExpenseData {
  amount: number;
  category: string;
  note: string;
  date: Date;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  food: 'food', lunch: 'food', dinner: 'food', breakfast: 'food', snacks: 'food', restaurant: 'food', zomato: 'food', swiggy: 'food', burger: 'food', pizza: 'food',
  travel: 'transport', transport: 'transport', uber: 'transport', ola: 'transport', cab: 'transport', taxi: 'transport', bus: 'transport', train: 'transport', flight: 'transport', fuel: 'transport', petrol: 'transport',
  grocery: 'grocery', milk: 'grocery', vegetables: 'grocery', fruits: 'grocery', supermarket: 'grocery', blinkit: 'grocery', zepto: 'grocery',
  shopping: 'shopping', amazon: 'shopping', flipkart: 'shopping', myntra: 'shopping', clothes: 'shopping',
  bills: 'bills', electricity: 'bills', water: 'bills', internet: 'bills', wifi: 'bills', mobile: 'bills', recharge: 'bills', rent: 'bills',
  health: 'health', medicine: 'health', doctor: 'health', gym: 'health', pharmacy: 'health',
  entertainment: 'entertainment', movie: 'entertainment', netflix: 'entertainment', spotify: 'entertainment', game: 'entertainment',
};

export function parseExpenseCommand(input: string): ExpenseData | null {
  const lower = input.toLowerCase();
  
  // 1. Extract Amount (First number found)
  const amountMatch = lower.match(/(\d+)/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[0], 10);

  // 2. Extract Date
  let date = new Date(); // Default today
  if (lower.includes('yesterday')) date = startOfYesterday();
  else if (lower.includes('day before')) date = subDays(new Date(), 2);
  
  // 3. Extract Category & Note
  // Remove amount and date words from string to find the rest
  let diff = lower
    .replace(amount.toString(), '')
    .replace('yesterday', '')
    .replace('day before', '')
    .trim();

  // Try to find a category keyword
  const words = diff.split(/\s+/);
  let category = 'miscellaneous'; // Default
  
  for (const w of words) {
    if (CATEGORY_KEYWORDS[w]) {
      category = CATEGORY_KEYWORDS[w];
      break;
    }
  }

  // Use the remaining text as note, cleaning up extra spaces
  const note = diff.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    amount,
    category,
    note: note || category.charAt(0).toUpperCase() + category.slice(1), // Fallback note
    date
  };
}
