export interface Member {
  id: string;
  name: string;
  color: string; // Tailwind color class for badge/border
  avatarEmoji: string; // Emoji avatar for mobile-friendly friendliness
  paymentHandle?: string; // Optional venmo or paypal handle
}

export interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // List of Member.id
}

export interface BillDetails {
  title: string;
  tax: number;
  tip: number;
  tipType: "percentage" | "flat";
  tipPercentage: number;
  serviceCharge: number;
  splitTaxTipMode: "proportional" | "equal";
  currency?: string; // e.g. HUF, USD, EUR
}

export interface ParsedReceiptResponse {
  items: {
    name: string;
    price: number;
    quantity?: number;
  }[];
  tax?: number;
  tip?: number;
  serviceCharge?: number;
  total?: number;
}
