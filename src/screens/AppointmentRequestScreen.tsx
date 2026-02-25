import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth, firestore } from '../services/firebaseConfig';
import { createAppointment, createAppointmentNotification, getPatientDocIdByAuthUid, getUserData } from '../services/firestore';

// Define a type for healthcare worker
interface HealthcareWorker {
  id: string;
  name: string;
  experience?: string;
  specialty?: string;
}

export default function AppointmentRequestScreen() {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [healthcareWorkers, setHealthcareWorkers] = useState<HealthcareWorker[]>([]);
  const [selectedHealthcareWorker, setSelectedHealthcareWorker] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [patientFirestoreId, setPatientFirestoreId] = useState<string | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [timeSlot, setTimeSlot] = useState('10:00 AM');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data and patient document ID
        const userId = auth.currentUser?.uid;
        if (userId) {
          const data = await getUserData(userId);
          setUserData(data);
          const pFirestoreId = await getPatientDocIdByAuthUid(userId);
          if (pFirestoreId) {
            setPatientFirestoreId(pFirestoreId);
          } else {
            console.error('Failed to retrieve patient Firestore document ID.');
            Alert.alert('Error', 'Could not retrieve your patient record. Please try again or contact support.');
            // Optionally, disable form or router.back()
          }
        }

        // Fetch healthcare workers
        await fetchHealthcareWorkers();
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      }
    };
    
    fetchData();
  }, []);

  const fetchHealthcareWorkers = async () => {
    try {
      setLoadingWorkers(true);
      
      // Create a query to fetch users with role 'healthcare_worker'
      const usersQuery = query(
        collection(firestore, 'users'),
        where('role', '==', 'Healthcare Worker')
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const workers: HealthcareWorker[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workers.push({
          id: doc.id,
          name: data.name || 'Healthcare Worker',
          experience: data.experience || '5 years',
          specialty: data.specialty || 'Cervical Health Specialist'
        });
      });
      
      setHealthcareWorkers(workers);
      
      // Set default selected worker if available
      if (workers.length > 0) {
        setSelectedHealthcareWorker(workers[0].id);
      }
    } catch (error) {
      console.error('Error fetching healthcare workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const formatDate = (dateToFormat: Date) => {
    return dateToFormat.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSubmit = async () => {
    if (!selectedHealthcareWorker) {
      Alert.alert('Error', 'Please select a healthcare worker.');
      return;
    }
    if (!patientFirestoreId) {
      Alert.alert('Error', 'Patient record ID not found. Cannot create appointment.');
      return;
    }

    // Ensure date is in the future
    const today = new Date();
    if (date < today) {
      Alert.alert('Invalid Date', 'Please select a future date for your appointment.');
      return;
    }

    setLoading(true);

    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId || !userData) {
        throw new Error('User not authenticated or data not loaded');
      }
      
      // Find the selected healthcare worker's name
      const selectedWorker = healthcareWorkers.find(worker => worker.id === selectedHealthcareWorker);
      const workerName = selectedWorker ? selectedWorker.name : 'Healthcare Worker';

      // Create the appointment
      const appointmentData = {
        patientId: patientFirestoreId,
        patientName: userData.name || 'Patient',
        healthcareWorkerId: selectedHealthcareWorker,
        healthcareWorkerName: workerName,
        requestedDate: date,
        appointmentTime: timeSlot,
        notes: notes.trim(),
        status: 'Pending',
        patientIdNumber: userData.patientId || '',
      };

      const appointmentId = await createAppointment(appointmentData);

      // Send notification to healthcare worker
      await createAppointmentNotification(
        selectedHealthcareWorker,
        'New Appointment Request',
        `${userData.name || 'A patient'} has requested an appointment on ${formatDate(date)} at ${timeSlot}`,
        appointmentId
      );

      Alert.alert(
        'Appointment Requested Successfully',
        'Your screening appointment request has been submitted. To view all your appointments, go to "View All Doctor & Screening Appointments" from the home screen.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Request Appointment</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerControls}>
                <TouchableOpacity 
                  style={styles.dateControlButton}
                  onPress={() => {
                    const newDate = new Date(date);
                    newDate.setDate(newDate.getDate() - 1);
                    setDate(newDate);
                  }}
                >
                  <MaterialIcons name="chevron-left" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <ThemedText style={styles.datePickerText}>
                  {formatDate(date)}
                </ThemedText>
                <TouchableOpacity 
                  style={styles.dateControlButton}
                  onPress={() => {
                    const newDate = new Date(date);
                    newDate.setDate(newDate.getDate() + 1);
                    setDate(newDate);
                  }}
                >
                  <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.timePickerContainer}>
              <ThemedText style={styles.timeSectionTitle}>Select Time</ThemedText>
              <View style={styles.timeOptionsContainer}>
                <TouchableOpacity
                  style={[styles.timeOption, timeSlot === '09:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setTimeSlot('09:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, timeSlot === '09:00 AM' && styles.selectedTimeOptionText]}>
                    09:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, timeSlot === '10:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setTimeSlot('10:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, timeSlot === '10:00 AM' && styles.selectedTimeOptionText]}>
                    10:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, timeSlot === '11:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setTimeSlot('11:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, timeSlot === '11:00 AM' && styles.selectedTimeOptionText]}>
                    11:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, timeSlot === '02:00 PM' && styles.selectedTimeOption]}
                  onPress={() => setTimeSlot('02:00 PM')}
                >
                  <ThemedText style={[styles.timeOptionText, timeSlot === '02:00 PM' && styles.selectedTimeOptionText]}>
                    02:00 PM
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notes (Optional)</ThemedText>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes or reason for appointment..."
              placeholderTextColor={Colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Select Healthcare Worker</ThemedText>
            {loadingWorkers ? (
              <View style={styles.workerLoadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <ThemedText style={styles.loadingText}>Loading healthcare workers...</ThemedText>
              </View>
            ) : healthcareWorkers.length === 0 ? (
              <ThemedText style={styles.noWorkersText}>
                No healthcare workers available at the moment.
              </ThemedText>
            ) : (
              <View style={styles.workersContainer}>
                {healthcareWorkers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    style={[
                      styles.workerItem,
                      selectedHealthcareWorker === worker.id && styles.selectedWorkerItem
                    ]}
                    onPress={() => setSelectedHealthcareWorker(worker.id)}
                  >
                    <View style={styles.workerIconContainer}>
                      <MaterialIcons
                        name="person"
                        size={24}
                        color={selectedHealthcareWorker === worker.id ? Colors.primary : Colors.textSecondary}
                      />
                    </View>
                    {selectedHealthcareWorker === worker.id && (
                      <View style={styles.checkIcon}>
                        <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                      </View>
                    )}
                    <ThemedText style={styles.workerSpecialty}>
                      {worker.specialty} • {worker.experience} exp
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Request Appointment</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: 'black',
  },
  datePickerContainer: {
    marginTop: 12,
  },
  datePickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  dateControlButton: {
    padding: 8,
  },
  datePickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'black',
  },
  timeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  timePickerContainer: {
    marginTop: 12,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeOption: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: 'rgba(103, 58, 183, 0.1)',
    borderColor: Colors.primary,
  },
  timeOptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectedTimeOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 16,
    height: 120,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  workerLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
  noWorkersText: {
    textAlign: 'center',
  },
  workersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  workerItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    height: 120,
    position: 'relative',
  },
  selectedWorkerItem: {
    backgroundColor: 'rgba(103, 58, 183, 0.1)',
    borderColor: Colors.primary,
  },
  workerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(103, 58, 183, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  workerSpecialty: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
}); 