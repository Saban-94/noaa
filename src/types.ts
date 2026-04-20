import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'manager_harash' | 'manager_talmid' | 'driver' | 'office';
  photoURL?: string;
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark';
    branch: 'החרש' | 'התלמיד' | 'both';
  };
}

export interface Order {
  id?: string;
  orderNumber?: string;
  date: string;
  time: string;
  driverId: string;
  customerName: string;
  destination: string;
  items: string;
  warehouse: 'החרש' | 'התלמיד';
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderFormId?: string;
  deliveryNoteId?: string;
  eta?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  source?: 'manual' | 'import' | 'chat';
  notes?: string;
}

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: Timestamp;
  visibility: 'everyone' | 'managers';
  type: 'text' | 'image' | 'file' | 'video' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  metadata?: any;
  readBy?: string[];
}

export interface InterBranchTransfer {
  id?: string;
  sourceBranch: 'החרש' | 'התלמיד';
  destinationBranch: 'החרש' | 'התלמיד';
  items: string;
  status: 'pending' | 'approved' | 'on_way' | 'delivered' | 'cancelled';
  requestedBy: string;
  requestedByName: string;
  assignedDriverId?: string;
  eta?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  vehicleType: 'truck' | 'crane';
  plateNumber?: string;
  vehicleModel?: string;
  status: 'active' | 'off_duty';
  totalDeliveries?: number;
  onTimeRate?: number;
  rating?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Customer {
  id?: string;
  customerNumber: string;
  name: string;
  contactPerson: string;
  phoneNumber: string;
  driveFolderId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Reminder {
  id?: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  isCompleted: boolean;
  orderId?: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
