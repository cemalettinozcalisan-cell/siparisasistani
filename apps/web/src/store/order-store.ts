import { create } from 'zustand';

export interface Order {
  id: string;
  order_number: string;
  customer_name?: string;
  total_price: number;
  status: string;
  channel: string;
  confidence: number;
  created_at: string;
  items?: { product_name: string; quantity: number; unit: string }[];
  customer_phone?: string;
}

interface OrderStore {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateStatus: (orderId: string, status: string) => void;
  setOrders: (orders: Order[]) => void;
  removeOrder: (orderId: string) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),
  updateStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o,
      ),
    })),
  setOrders: (orders) => set({ orders }),
  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
    })),
}));
