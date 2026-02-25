import { Timestamp } from 'firebase/firestore';

/**
 * Interface for Patient data
 */
export interface Patient {
  id?: string;
  name: string;
  age: number;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  menstrualStatus?: string;
  symptoms?: string[];
  medicalHistory: string;
  createdAt?: Timestamp;
  patientId?: string; // Unique patient ID
  userId?: string; // Link to auth user ID
}

/**
 * Interface for Screening data
 */
export interface Screening {
  id?: string;
  patientId: string;
  patientName?: string;
  imageUrl: string;
  adjustedImageUrl?: string;
  status: 'Pending' | 'Uploaded' | 'Reviewed';
  reviewStatus?: 'Normal' | 'Abnormal' | 'Pending';
  doctorComments?: string;
  doctorId?: string;
  createdAt?: Timestamp;
  healthcareWorkerId: string;
}

/**
 * Interface for Report data (simplified screening for display)
 */
export interface Report {
  id: string;
  date: string;
  status: 'Normal' | 'Abnormal' | 'Pending';
}

/**
 * Interface for Notification data
 */
export interface Notification {
  id?: string;
  recipientId: string;
  type: 
    | 'appointment' 
    | 'screening' 
    | 'system' 
    | 'APPOINTMENT_REQUEST' 
    | 'APPOINTMENT_UPDATE' 
    | 'SCREENING_UPLOADED'
    | 'SCREENING_UPDATE'
    | 'SCREENING_REVIEWED';
  title: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp;
  data?: {
    screeningId?: string;
    appointmentId?: string;
    [key: string]: any;
  };
}

/**
 * Interface for Appointment data
 */
export interface Appointment {
  id?: string;
  patientId: string;
  patientName: string;
  healthcareWorkerId?: string;
  healthcareWorkerName?: string;
  doctorId?: string;
  doctorName?: string;
  type?: 'doctor' | 'screening';
  providerName?: string;
  requestedDate: Timestamp;
  status: 'Pending' | 'Accepted' | 'Rescheduled' | 'Completed' | 'Cancelled';
  appointmentTime?: string;
  rescheduledDate?: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  completedAt?: Timestamp;
} 