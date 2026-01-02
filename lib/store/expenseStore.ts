import { create } from 'zustand';

export type Transaction = {
  _id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // ISO Date string
  note?: string;
};

interface ExpenseState {
  transactions: Transaction[];
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
  reset: () => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  transactions: [],
  isLoading: false,
  isInitialized: false,

  setTransactions: (transactions) => set({ transactions, isInitialized: true, isLoading: false }),
  
  addTransaction: (transaction) => set((state) => ({ 
    transactions: [transaction, ...state.transactions] 
  })),
  
  removeTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter(t => t._id !== id)
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  initialize: () => set({ isInitialized: true }),

  reset: () => set({ transactions: [], isInitialized: false, isLoading: false })
}));
