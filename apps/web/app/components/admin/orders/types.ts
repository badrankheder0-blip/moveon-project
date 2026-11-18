import type { OrderStatus } from "@/lib/admin/format";

/** What `/api/orders` returns to staff, one row of the orders table. */
export interface OrderRow {
  id: string;
  reference: string;
  status: OrderStatus;
  serviceType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  customerType: "private" | "business";
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledSecondDate: string | null;
  totalGross: string;
  paidAmount: string;
  teamId: string | null;
  vehicleId: string | null;
  teamName: string | null;
  teamArea: string | null;
  vehicleName: string | null;
  company: string | null;
  discountCode: string | null;
  discountGross: string;
  quoteSentAt: string | null;
  createdAt: string;
}

export interface StatusCounts {
  all: number;
  quoted: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface OrderPage {
  items: OrderRow[];
  nextCursor?: string;
  counts?: StatusCounts;
}

export interface PriceLineView {
  key: string;
  params: Record<string, string | number>;
  net: string;
  gross: string;
}

export interface PriceView {
  vatRate: string;
  lines: PriceLineView[];
  discount: { code: string; gross: string } | null;
  subtotalGross: string;
  totalGross: string;
  netAmount: string;
  vatAmount: string;
}

export interface DateRequest {
  id: string;
  requestedDate: string;
  requestedTime: string | null;
  reason: string | null;
  status: "requested" | "approved" | "declined";
  createdAt: string;
  decidedAt: string | null;
}

export interface Answer {
  value: string;
  byTeam?: boolean;
}

/** `/api/orders/:id` for staff: the row plus what the detail page shows. */
export interface OrderDetail {
  id: string;
  reference: string;
  userId: string;
  status: OrderStatus;
  serviceType: string;
  customerType: "private" | "business";
  contactName: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail: string;
  contactPhone: string;
  originAddress: string;
  destinationAddress: string | null;
  originFloor: number;
  destinationFloor: number;
  originHasElevator: boolean;
  destinationHasElevator: boolean;
  distanceKm: string | null;
  calculationMethod: "area" | "items";
  areaSqm: number | null;
  selectedItems: Record<string, number> | null;
  extraServices: Record<string, unknown> | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledSecondDate: string | null;
  capacityUnits: number;
  crewSize: number;
  estimatedHours: string | null;
  netAmount: string;
  vatRate: string;
  vatAmount: string;
  totalGross: string;
  depositAmount: string;
  paidAmount: string;
  discountCode: string | null;
  notes: string | null;
  locale: string;
  teamId: string | null;
  vehicleId: string | null;
  internalNotes?: string | null;
  answers: Record<string, Answer> | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  team: { id: string; name: string; area: string | null; colour: string } | null;
  vehicle: { id: string; name: string; plate: string | null; capacityM3: string | null } | null;
  dateRequests: DateRequest[];
  quoteSentAt: string | null;
  items: { id: string; name: string; category: string | null; count: number; volumeM3: string | null }[];
  price: PriceView;
}

export interface Team {
  id: string;
  name: string;
  area: string | null;
  colour?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string | null;
  capacityM3: string | number | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  totalGross?: string;
  issueDate?: string;
  dueDate?: string;
}
