import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { LandingOrder, LandingOrderStatus } from "../../types/landing";
import { LANDING_ORDER_COLLECTION } from "./landingSchema";

function landingOrderFromSnapshot(id: string, data: Record<string, unknown>): LandingOrder {
  return { ...data, id } as LandingOrder;
}

export async function getLandingOrderById(id: string): Promise<LandingOrder | null> {
  const snapshot = await getDoc(doc(db, LANDING_ORDER_COLLECTION, id));
  return snapshot.exists() ? landingOrderFromSnapshot(snapshot.id, snapshot.data()) : null;
}

export async function listLandingOrders(): Promise<LandingOrder[]> {
  const snapshot = await getDocs(collection(db, LANDING_ORDER_COLLECTION));
  return snapshot.docs
    .map((item) => landingOrderFromSnapshot(item.id, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function subscribeLandingOrders(
  onData: (orders: LandingOrder[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, LANDING_ORDER_COLLECTION), limit(50)), (snapshot) => {
    const orders = snapshot.docs
      .map((item) => landingOrderFromSnapshot(item.id, item.data()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(orders);
  }, onError);
}

/** Sidebar badge: only new orders, capped at 100 to avoid reading order history. */
export function subscribeNewLandingOrderCount(
  onCount: (count: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, LANDING_ORDER_COLLECTION), where('status', '==', 'new'), limit(100)),
    snapshot => onCount(snapshot.size), onError);
}

export async function updateLandingOrderStatus(id: string, status: LandingOrderStatus): Promise<void> {
  await setDoc(doc(db, LANDING_ORDER_COLLECTION, id), {
    status,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function updateLandingOrder(id: string, patch: Partial<Pick<LandingOrder, "status" | "adminNote" | "assignedTo">>): Promise<void> {
  await setDoc(doc(db, LANDING_ORDER_COLLECTION, id), { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}

// Public order creation is intentionally absent. Task 8 will create orders through a Next.js API.
