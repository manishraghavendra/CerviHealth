import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { firestore } from './firebaseConfig';

/**
 * Generate a unique patient ID
 * @returns {Promise<string>} - A unique patient ID
 */
export const generatePatientId = async () => {
  try {
    // Get the current count of patients to use as part of the ID
    const patientsRef = collection(firestore, 'patients');
    const querySnapshot = await getDocs(patientsRef);
    const count = querySnapshot.size + 1;
    
    // Format: PT-YYYY-XXXXX where XXXXX is a zero-padded sequence number
    const year = new Date().getFullYear();
    const paddedCount = String(count).padStart(5, '0');
    return `PT-${year}-${paddedCount}`;
  } catch (error) {
    console.error('Error generating patient ID:', error);
    throw error;
  }
};

/**
 * Save user data to Firestore
 * @param {string} userId - The user's ID from Firebase Auth
 * @param {string} name - The user's full name
 * @param {string} email - The user's email
 * @param {string} phoneNumber - The user's phone number
 * @param {string} role - The user's role (Patient, Healthcare Worker, Doctor)
 * @returns {Promise<void>}
 */
export const saveUserData = async (userId, name, email, phoneNumber, role) => {
  try {
    // Generate a patient ID if this is a patient
    let patientId = null;
    if (role === 'Patient') {
      patientId = await generatePatientId();
    }
    
    await setDoc(doc(firestore, 'users', userId), {
      name,
      email,
      phoneNumber,
      role,
      patientId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // If this is a patient, also create a patient record
    if (role === 'Patient') {
      await addDoc(collection(firestore, 'patients'), {
        name,
        phoneNumber,
        patientId,
        userId, // Link to auth user
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

/**
 * Get user data from Firestore
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - The user data object or null if not found
 */
export const getUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

/**
 * Update user data in Firestore
 * @param {string} userId - The user's ID
 * @param {Object} data - The data to update
 * @returns {Promise<void>}
 */
export const updateUserData = async (userId, data) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

/**
 * Check if a user exists with the given email
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} - Whether the user exists
 */
export const checkUserExists = async (email) => {
  try {
    const querySnapshot = await query(
      collection(firestore, 'users'),
      where('email', '==', email),
      limit(1)
    ).get();
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

/**
 * Save patient data to Firestore
 * @param {Object} patientData - The patient data object
 * @param {string} patientData.name - The patient's full name
 * @param {number} patientData.age - The patient's age
 * @param {string} patientData.phoneNumber - The patient's phone number
 * @param {string} patientData.email - The patient's email address
 * @param {string} patientData.address - The patient's address
 * @param {string} patientData.bloodGroup - The patient's blood group
 * @param {string} patientData.menstrualStatus - The patient's menstrual status
 * @param {Array} patientData.symptoms - Array of patient symptoms
 * @param {string} patientData.medicalHistory - The patient's medical history
 * @returns {Promise<string>} - The patient document ID
 */
export const savePatient = async (patientData) => {
  try {
    // Prepare patient data with defaults for any missing fields
    const patientDataWithDefaults = {
      ...patientData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(firestore, 'patients'), patientDataWithDefaults);
    return docRef.id;
  } catch (error) {
    console.error('Error saving patient data:', error);
    throw error;
  }
};

/**
 * Get patient data by ID
 * @param {string} patientId - The patient's ID
 * @returns {Promise<Object|null>} - The patient data object or null if not found
 */
export const getPatient = async (patientId) => {
  try {
    const patientDoc = await getDoc(doc(firestore, 'patients', patientId));
    if (patientDoc.exists()) {
      return {
        id: patientDoc.id,
        ...patientDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting patient data:', error);
    throw error;
  }
};

/**
 * Get all patients
 * @returns {Promise<Array>} - Array of patient objects
 */
export const getAllPatients = async () => {
  try {
    const patientsQuery = query(
      collection(firestore, 'patients'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(patientsQuery);
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return patients;
  } catch (error) {
    console.error('Error getting all patients:', error);
    throw error;
  }
};

/**
 * Get all patient IDs and names for dropdown selection
 * @returns {Promise<Array>} - Array of patient ID objects with label and value
 */
export const getAllPatientIds = async () => {
  try {
    const patientsQuery = query(
      collection(firestore, 'patients'),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(patientsQuery);
    const patientOptions = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name && doc.id) {
        patientOptions.push({
          label: `${data.name} - ${data.patientId || 'No ID'}`,
          value: doc.id
        });
      }
    });
    
    return patientOptions;
  } catch (error) {
    console.error('Error getting patient IDs:', error);
    throw error;
  }
};

/**
 * Get patient document ID from the 'patients' collection using Auth UID.
 * @param {string} authUid - The Firebase Auth User ID.
 * @returns {Promise<string|null>} - The patient's document ID from 'patients' collection or null.
 */
export const getPatientDocIdByAuthUid = async (authUid) => {
  if (!authUid) return null;
  try {
    const q = query(
      collection(firestore, 'patients'),
      where('userId', '==', authUid),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error getting patient document ID by Auth UID:', error);
    // It might be better to return null or a specific error indicator
    // rather than re-throwing, depending on how the caller handles it.
    // For now, re-throwing to maintain consistency with other functions.
    throw error; 
  }
};

/**
 * Create a notification
 * @param {string} recipientId - The user ID to receive the notification
 * @param {string} type - The notification type (e.g., 'screening', 'appointment', 'system')
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {Object} data - Additional data for the notification (screeningId, appointmentId, etc.)
 * @returns {Promise<string>} - The notification document ID
 */
export const createNotification = async (recipientId, type, title, message, data = {}) => {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      recipientId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of notification objects
 */
export const getUserNotifications = async (userId) => {
  try {
    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(notificationsQuery);
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 * @returns {Promise<boolean>} - Success status
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Create a new screening record
 * @param {Object} screeningData - The screening data object
 * @param {string} screeningData.patientId - The patient's ID
 * @param {string} screeningData.imageUrl - URL of the uploaded cervical image
 * @param {string} screeningData.status - Status of the screening (Pending, Uploaded, Reviewed)
 * @param {string} screeningData.healthcareWorkerId - ID of the healthcare worker who performed the screening
 * @returns {Promise<string>} - The screening document ID
 */
export const createScreeningRecord = async (screeningData) => {
  try {
    const screeningsRef = collection(firestore, 'screenings');
    const docRef = await addDoc(screeningsRef, {
      ...screeningData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Create notification for the patient
    const patientId = screeningData.patientId;
    if (patientId) {
      const patientData = await getPatient(patientId);
      if (patientData) {
        await createNotification(
          patientId,
          'NewReport',
          'New Report Available',
          'Your cervical screening report has been uploaded.',
          { screeningId: docRef.id }
        );
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating screening record:', error);
    throw error;
  }
};

// Get screening record by ID
export const getScreeningRecord = async (screeningId) => {
  try {
    const screeningDoc = await getDoc(doc(firestore, 'screenings', screeningId));
    if (screeningDoc.exists()) {
      return screeningDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting screening record:', error);
    throw error;
  }
};

// Get all screenings for a patient
export const getPatientScreenings = async (patientId) => {
  try {
    const screeningsQuery = query(
      collection(firestore, 'screenings'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(screeningsQuery);
    const screenings = [];
    querySnapshot.forEach((doc) => {
      screenings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return screenings;
  } catch (error) {
    console.error('Error getting patient screenings:', error);
    throw error;
  }
};

/**
 * Update screening with adjusted image URL
 * @param {string} screeningId - The screening document ID
 * @param {string} adjustedImageUrl - URL of the adjusted image with Cloudinary transformations
 * @returns {Promise<boolean>} - Success status
 */
export const updateScreeningImage = async (screeningId, adjustedImageUrl) => {
  try {
    const screeningRef = doc(firestore, 'screenings', screeningId);
    await updateDoc(screeningRef, {
      adjustedImageUrl,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating screening with adjusted image:', error);
    throw error;
  }
};

/**
 * Update screening with doctor's review
 * @param {string} screeningId - The screening document ID
 * @param {string} reviewStatus - The review status (Normal, Abnormal, Pending)
 * @param {string} doctorComments - The doctor's comments
 * @param {string} doctorId - The ID of the doctor who reviewed
 * @returns {Promise<boolean>} - Success status
 */
export const updateScreeningReview = async (screeningId, reviewStatus, doctorComments, doctorId) => {
  try {
    const screeningRef = doc(firestore, 'screenings', screeningId);
    await updateDoc(screeningRef, {
      reviewStatus,
      doctorComments,
      doctorId,
      status: 'Reviewed',
      updatedAt: serverTimestamp()
    });
    
    // Get screening data to access patient and healthcare worker IDs
    const screeningData = await getScreeningRecord(screeningId);
    if (screeningData) {
      // Get patient data for the notification message
      const patientData = await getPatient(screeningData.patientId);
      const patientName = patientData ? patientData.name : 'the patient';
      
      // Notify the healthcare worker who uploaded the screening
      if (screeningData.healthcareWorkerId) {
        await createNotification(
          screeningData.healthcareWorkerId,
          'ReviewCompleted',
          'Review Completed',
          `The screening report for ${patientName} has been reviewed.`,
          { screeningId }
        );
      }
      
      // Notify the patient about the completed review
      if (screeningData.patientId) {
        await createNotification(
          screeningData.patientId,
          'ReviewCompleted',
          'Review Completed',
          'Your screening report has been reviewed by the doctor.',
          { screeningId }
        );
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating screening with review:', error);
    throw error;
  }
};

/**
 * Get pending screenings for review by doctors
 * These are screenings with status 'Uploaded' that need review
 * @returns {Promise<Array>} - Array of screening objects with patient data
 */
export const getPendingScreenings = async () => {
  try {
    const screeningsQuery = query(
      collection(firestore, 'screenings'),
      where('status', '==', 'Uploaded')
    );
    
    const querySnapshot = await getDocs(screeningsQuery);
    const screenings = [];
    
    for (const screeningDoc of querySnapshot.docs) {
      const screeningData = {
        id: screeningDoc.id,
        ...screeningDoc.data()
      };
      
      if (screeningData.patientId) {
        const patientDocumentRef = doc(firestore, 'patients', screeningData.patientId);
        const patientDocSnapshot = await getDoc(patientDocumentRef);
        if (patientDocSnapshot.exists()) {
          const patientData = patientDocSnapshot.data();
          screeningData.patientName = patientData.name;
        } else {
          screeningData.patientName = 'Unknown Patient';
        }
      } else {
        screeningData.patientName = 'Unknown Patient';
      }

      if (screeningData.healthcareWorkerId) {
        const hcwData = await getUserData(screeningData.healthcareWorkerId);
        screeningData.healthcareWorkerName = hcwData ? hcwData.name : 'Unknown HCW';
      } else {
        screeningData.healthcareWorkerName = 'N/A'; // Healthcare worker ID might be missing
      }
      
      screenings.push(screeningData);
    }
    
    screenings.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      const dateA = a.createdAt.seconds || 0;
      const dateB = b.createdAt.seconds || 0;
      return dateB - dateA;
    });
    
    return screenings;
  } catch (error) {
    console.error('Error getting pending screenings:', error);
    throw error;
  }
};

/**
 * Create a new appointment
 * @param {Object} appointmentData - The appointment data
 * @param {string} appointmentData.patientId - The patient's ID
 * @param {string} appointmentData.patientName - The patient's name
 * @param {string} appointmentData.healthcareWorkerId - The healthcare worker's ID
 * @param {Date|firebase.firestore.Timestamp} appointmentData.requestedDate - The requested date
 * @param {string} appointmentData.status - The appointment status
 * @returns {Promise<string>} - The appointment document ID
 */
export const createAppointment = async (appointmentData) => {
  try {
    const appointmentsRef = collection(firestore, 'appointments');
    const docRef = await addDoc(appointmentsRef, {
      ...appointmentData,
      type: 'screening', // Set appointment type for screening appointments
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

/**
 * Get appointment by ID
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object|null>} - The appointment data or null if not found
 */
export const getAppointment = async (appointmentId) => {
  try {
    const appointmentDoc = await getDoc(doc(firestore, 'appointments', appointmentId));
    if (appointmentDoc.exists()) {
      return {
        id: appointmentDoc.id,
        ...appointmentDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting appointment:', error);
    throw error;
  }
};

/**
 * Get appointments for a healthcare worker (with optional status filter)
 * @param {string} healthcareWorkerId - The healthcare worker's ID
 * @param {string|string[]|null} status - Optional status filter ('Pending', 'Accepted', etc.) or array of statuses
 * @param {number} limitCount - Optional limit on the number of appointments to retrieve
 * @returns {Promise<Array>} - Array of appointment objects
 */
export const getHealthcareWorkerAppointments = async (healthcareWorkerId, status = null, limitCount = null) => {
  try {
    let appointmentsQuery;
    
    if (status) {
      // If status is an array, use 'in' operator
      if (Array.isArray(status)) {
        appointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('healthcareWorkerId', '==', healthcareWorkerId),
          where('status', 'in', status),
          orderBy('requestedDate', 'desc')
        );
      } else {
        // If status is a string, use equality operator
        appointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('healthcareWorkerId', '==', healthcareWorkerId),
          where('status', '==', status),
          orderBy('requestedDate', 'desc')
        );
      }
    } else {
      // If no status filter, get all appointments
      appointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('healthcareWorkerId', '==', healthcareWorkerId),
        orderBy('requestedDate', 'desc')
      );
    }

    // Apply limit if provided
    if (limitCount) {
      appointmentsQuery = query(appointmentsQuery, limit(limitCount));
    }

    const querySnapshot = await getDocs(appointmentsQuery);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting healthcare worker appointments:', error);
    throw error;
  }
};

/**
 * Update appointment status
 * @param {string} appointmentId - The appointment ID
 * @param {string} status - The new status ('Accepted', 'Rescheduled', 'Completed', 'Cancelled')
 * @param {Object} additionalData - Additional data to update (optional)
 * @returns {Promise<boolean>} - Success status
 */
export const updateAppointmentStatus = async (appointmentId, status, additionalData = {}) => {
  try {
    const appointmentRef = doc(firestore, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
};

/**
 * Get appointments for a patient
 * @param {string} patientId - The patient's ID
 * @returns {Promise<Array>} - Array of appointment objects
 */
export const getPatientAppointments = async (patientId) => {
  try {
    const appointmentsQuery = query(
      collection(firestore, 'appointments'),
      where('patientId', '==', patientId),
      orderBy('requestedDate', 'desc')
    );
    
    const querySnapshot = await getDocs(appointmentsQuery);
    const appointments = [];
    
    for (const doc of querySnapshot.docs) {
      const appointmentData = {
        id: doc.id,
        ...doc.data()
      };
      
      // Add provider name field based on appointment type
      if (appointmentData.type === 'doctor' && appointmentData.doctorId) {
        const doctorData = await getUserData(appointmentData.doctorId);
        appointmentData.providerName = doctorData ? doctorData.name : 'Unknown Doctor';
      } else if (appointmentData.healthcareWorkerId) {
        const hwData = await getUserData(appointmentData.healthcareWorkerId);
        appointmentData.providerName = hwData ? hwData.name : 'Unknown HCW';
      }
      
      appointments.push(appointmentData);
    }
    
    return appointments;
  } catch (error) {
    console.error('Error getting patient appointments:', error);
    throw error;
  }
};

/**
 * Create a notification for an appointment
 * @param {string} recipientId - The recipient user ID
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} appointmentId - The associated appointment ID
 * @returns {Promise<string>} - The notification document ID
 */
export const createAppointmentNotification = async (recipientId, title, message, appointmentId) => {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      recipientId,
      type: 'appointment',
      title,
      message,
      data: { appointmentId },
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating appointment notification:', error);
    throw error;
  }
};

/**
 * Get screenings reviewed by a specific doctor, ordered by the last update time.
 * @param {string} doctorId - The doctor's ID.
 * @returns {Promise<Array>} - Array of screening objects with patient data.
 */
export const getScreeningsReviewedByDoctor = async (doctorId) => {
  try {
    const screeningsQuery = query(
      collection(firestore, 'screenings'),
      where('doctorId', '==', doctorId),
      where('status', '==', 'Reviewed'),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(screeningsQuery);
    const screenings = [];
    for (const docSnapshot of querySnapshot.docs) {
      const screeningData = { id: docSnapshot.id, ...docSnapshot.data() };
      // Fetch patient name if not directly available or to ensure it's fresh
      if (screeningData.patientId && !screeningData.patientName) {
        const patient = await getPatient(screeningData.patientId);
        screeningData.patientName = patient ? patient.name : 'Unknown Patient';
      }
      // Fetch healthcare worker name for notification purposes, if needed later on the screen
      if (screeningData.healthcareWorkerId && !screeningData.healthcareWorkerName) {
        const hcwData = await getUserData(screeningData.healthcareWorkerId);
        screeningData.healthcareWorkerName = hcwData ? hcwData.name : 'Unknown HCW';
      }
      screenings.push(screeningData);
    }
    return screenings;
  } catch (error) {
    console.error('Error getting screenings reviewed by doctor:', error);
    throw error;
  }
};

/**
 * Updates the details of a doctor's review for a screening.
 * Also triggers a notification to the healthcare worker who submitted the screening.
 * @param {string} screeningId - The ID of the screening to update.
 * @param {string} newReviewStatus - The new review status ('Normal', 'Abnormal').
 * @param {string} newDoctorComments - The new comments from the doctor.
 * @param {string} healthcareWorkerId - The ID of the healthcare worker to notify.
 * @param {string} doctorName - The name of the doctor making the update (for notification).
 * @param {string} patientNameForNotif - The name of the patient (for notification).
 * @returns {Promise<boolean>} - Success status.
 */
export const updateDoctorScreeningReviewDetails = async (
  screeningId,
  newReviewStatus,
  newDoctorComments,
  healthcareWorkerId,
  doctorName,
  patientNameForNotif
) => {
  try {
    const screeningRef = doc(firestore, 'screenings', screeningId);
    await updateDoc(screeningRef, {
      reviewStatus: newReviewStatus,
      doctorComments: newDoctorComments,
      // doctorId and status='Reviewed' should already be set from initial review
      updatedAt: serverTimestamp() // Important to update this timestamp
    });

    // Notify the healthcare worker about the update
    if (healthcareWorkerId) {
      await createNotification(
        healthcareWorkerId,
        'ReviewUpdated', // A new, specific notification type
        'Screening Review Updated',
        `Dr. ${doctorName || 'The Doctor'} has updated the review for ${patientNameForNotif || 'the patient'}. New status: ${newReviewStatus}.`,
        { screeningId } // Include screeningId in notification data
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating screening review details by doctor:', error);
    throw error;
  }
};

// Add functions for doctor appointment management

/**
 * Create a new doctor appointment request
 * @param {Object} appointmentData - The appointment data
 * @param {string} appointmentData.patientId - The patient's ID
 * @param {string} appointmentData.patientName - The patient's name
 * @param {string} appointmentData.doctorId - The doctor's ID
 * @param {Date|firebase.firestore.Timestamp} appointmentData.requestedDate - The requested date
 * @returns {Promise<string>} - The appointment document ID
 */
export const createDoctorAppointment = async (appointmentData) => {
  try {
    const appointmentsRef = collection(firestore, 'appointments');
    const docRef = await addDoc(appointmentsRef, {
      ...appointmentData,
      type: 'doctor', // Mark this as a doctor appointment
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Create notification for the doctor
    if (appointmentData.doctorId) {
      await createNotification(
        appointmentData.doctorId,
        'APPOINTMENT_REQUEST',
        'New Appointment Request',
        `Patient ${appointmentData.patientName} has requested an appointment.`,
        { appointmentId: docRef.id }
      );
    }
    
    // Create notification for the patient
    if (appointmentData.patientId) {
      await createNotification(
        appointmentData.patientId,
        'APPOINTMENT_UPDATE',
        'Appointment Requested',
        `Your appointment request with a doctor has been submitted.`,
        { appointmentId: docRef.id }
      );
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating doctor appointment:', error);
    throw error;
  }
};

/**
 * Get all doctors available for appointments
 * @returns {Promise<Array>} - Array of doctor objects
 */
export const getAvailableDoctors = async () => {
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('role', '==', 'Doctor'));
    const querySnapshot = await getDocs(q);
    
    const doctors = [];
    querySnapshot.forEach((doc) => {
      doctors.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return doctors;
  } catch (error) {
    console.error('Error getting available doctors:', error);
    throw error;
  }
};

/**
 * Get pending appointments for a doctor
 * @param {string} doctorId - The doctor's ID
 * @returns {Promise<Array>} - Array of appointment objects
 */
export const getDoctorAppointments = async (doctorId, status = null) => {
  try {
    let appointmentsQuery;
    
    if (status) {
      // If status is an array, use 'in' operator
      if (Array.isArray(status)) {
        appointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('doctorId', '==', doctorId),
          where('type', '==', 'doctor'),
          where('status', 'in', status),
          orderBy('requestedDate', 'desc')
        );
      } else {
        // If status is a string, use equality operator
        appointmentsQuery = query(
          collection(firestore, 'appointments'),
          where('doctorId', '==', doctorId),
          where('type', '==', 'doctor'),
          where('status', '==', status),
          orderBy('requestedDate', 'desc')
        );
      }
    } else {
      // If no status filter, get all appointments
      appointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('doctorId', '==', doctorId),
        where('type', '==', 'doctor'),
        orderBy('requestedDate', 'desc')
      );
    }

    const querySnapshot = await getDocs(appointmentsQuery);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting doctor appointments:', error);
    throw error;
  }
};

/**
 * Update patient data in Firestore
 * @param {string} patientId - The patient's ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<boolean>} - Success status
 */
export const updatePatient = async (patientId, updateData) => {
  try {
    const defaultData = {
      email: "",
      address: "",
      bloodGroup: "",
      menstrualStatus: "",
      symptoms: [],
      medicalHistory: "",
      ...updateData,
      updatedAt: Timestamp.now()
    };
    
    const patientRef = doc(firestore, 'patients', patientId);
    await updateDoc(patientRef, defaultData);
    
    return true;
  } catch (error) {
    console.error('Error updating patient with missing fields:', error);
    throw error;
  }
};

/**
 * Get patient data by ID with fallback values for missing fields
 * @param {string} patientId - The patient's ID
 * @returns {Promise<Object|null>} - The patient data object with default values or null if not found
 */
export const getPatientWithDefaults = async (patientId) => {
  try {
    const patientDoc = await getDoc(doc(firestore, 'patients', patientId));
    if (patientDoc.exists()) {
      const data = patientDoc.data();
      return {
        id: patientDoc.id,
        name: data.name || 'Unknown',
        age: data.age || 0,
        phoneNumber: data.phoneNumber || 'Not provided',
        email: data.email || 'Not provided',
        address: data.address || 'Not provided',
        bloodGroup: data.bloodGroup || 'Not specified',
        menstrualStatus: data.menstrualStatus || 'Not specified',
        symptoms: data.symptoms || [],
        medicalHistory: data.medicalHistory || 'No history provided',
        ...data, // Include any other fields that might exist
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting patient data with defaults:', error);
    throw error;
  }
};

/**
 * Debug function to check patient data structure
 * @param {string} patientId - The patient's ID
 * @returns {Promise<Object>} - Raw patient data for debugging
 */
export const debugPatientData = async (patientId) => {
  try {
    const patientRef = doc(firestore, 'patients', patientId);
    const docSnap = await getDoc(patientRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error debugging patient data:', error);
    throw error;
  }
};

/**
 * Update an existing patient record with missing fields (for testing/migration)
 * @param {string} patientId - The patient's ID
 * @param {Object} additionalData - Additional fields to add
 * @returns {Promise<boolean>} - Success status
 */
export const updatePatientWithMissingFields = async (patientId, additionalData = {}) => {
  try {
    const defaultData = {
      email: additionalData.email || 'patient@example.com',
      address: additionalData.address || '123 Main Street, City',
      bloodGroup: additionalData.bloodGroup || 'O+',
      menstrualStatus: additionalData.menstrualStatus || 'Pre-Menopausal',
      symptoms: additionalData.symptoms || ['None'],
      medicalHistory: additionalData.medicalHistory || 'No significant medical history',
      ...additionalData
    };

    console.log('Updating patient', patientId, 'with data:', defaultData);
    
    const result = await updatePatient(patientId, defaultData);
    
    if (result) {
      console.log('Patient updated successfully');
    }
    
    return result;
  } catch (error) {
    console.error('Error updating patient with missing fields:', error);
    throw error;
  }
};

/**
 * Update all existing patients with missing fields
 * @returns {Promise<number>} - Number of patients updated
 */
export const updateAllPatientsWithMissingFields = async () => {
  try {
    const patientsSnapshot = await getDocs(collection(firestore, 'patients'));
    let updatedCount = 0;
    
    for (const doc of patientsSnapshot.docs) {
      const patient = { id: doc.id, ...doc.data() };
      
      // Check if patient is missing any of the new fields
      const needsUpdate = !patient.email || !patient.address || !patient.bloodGroup || 
                         !patient.menstrualStatus || !patient.symptoms || !patient.medicalHistory;
      
      if (needsUpdate) {
        await updatePatient(patient.id, {});
        updatedCount++;
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error('Error updating patients with missing fields:', error);
    throw error;
  }
};
