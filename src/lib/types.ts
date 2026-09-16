export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: number;
  image_url: string | null;
  duration_label: string | null;
  is_active: boolean;
  stock_count?: number;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface OrderRow {
  id: string;
  invoice_number: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  total_amount: number;
  payment_url: string | null;
  created_at: string;
  paid_at: string | null;
}
