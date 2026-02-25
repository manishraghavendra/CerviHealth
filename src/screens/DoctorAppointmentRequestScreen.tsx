import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth } from '../services/firebaseConfig';
import { createDoctorAppointment, getAvailableDoctors, getPatient, getPatientDocIdByAuthUid } from '../services/firestore';

// Define interfaces
interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  [key: string]: any;
}

interface Patient {
  id?: string;
  name?: string;
  age?: number;
  phoneNumber?: string;
  medicalHistory?: string;
  [key: string]: any;
}

export default function DoctorAppointmentRequestScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch doctors list
        const doctorsList = await getAvailableDoctors();
        setDoctors(doctorsList as Doctor[]);

        // Get current patient ID and name
        const currentUser = auth.currentUser;
        if (currentUser) {
          const patDocId = await getPatientDocIdByAuthUid(currentUser.uid);
          if (patDocId) {
            setPatientId(patDocId);
            const patientData = await getPatient(patDocId);
            if (patientData) {
              // Cast to Patient type with type assertion
              const typedPatientData = patientData as Patient;
              setPatientName(typedPatientData.name || '');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load doctors list. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDateTime = () => {
    return `${selectedDate.toLocaleDateString()} at ${selectedTime}`;
  };

  const handleSubmit = async () => {
    if (!selectedDoctor) {
      setError('Please select a doctor');
      return;
    }

    if (!selectedDate) {
      setError('Please select a preferred date');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Create a date object combining the selected date and time
      const dateTime = new Date(selectedDate);
      // Parse time (basic handling for AM/PM)
      const timeParts = selectedTime.match(/(\d+):(\d+)\s?(AM|PM)/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const period = timeParts[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        dateTime.setHours(hours, minutes, 0, 0);
      }

      const appointmentData = {
        patientId,
        patientName,
        doctorId: selectedDoctor.id,
        requestedDate: dateTime,
        notes: notes.trim(),
        type: 'doctor',
      };

      await createDoctorAppointment(appointmentData);

      Alert.alert(
        'Doctor Appointment Requested',
        'Your doctor appointment request has been submitted successfully. To view all your appointments, go to "View All Doctor & Screening Appointments" from the home screen.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Error submitting appointment request:', err);
      setError('Failed to submit appointment request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDoctorCard = (doctor: Doctor, index: number) => {
    const isSelected = selectedDoctor && selectedDoctor.id === doctor.id;
    
    return (
      <TouchableOpacity
        key={doctor.id || index}
        style={[
          styles.doctorCard,
          isSelected && styles.selectedDoctorCard,
        ]}
        onPress={() => setSelectedDoctor(doctor)}
      >
        <View style={styles.doctorCardContent}>
          <View style={[styles.doctorIconContainer, isSelected && styles.selectedDoctorIconContainer]}>
            <MaterialIcons name="person" size={24} color={isSelected ? '#FFFFFF' : Colors.primary} />
          </View>
          <View style={styles.doctorInfo}>
            <ThemedText style={styles.doctorName}>{doctor.name || 'Unknown Doctor'}</ThemedText>
            <ThemedText style={styles.doctorDetails}>
              {doctor.specialization || 'General Physician'}
            </ThemedText>
          </View>
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color={Colors.primary} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ThemedText style={styles.loadingText}>Loading doctors...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Request Doctor Appointment</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Select a Doctor</ThemedText>
              {doctors.length > 0 ? (
                <View style={styles.doctorsList}>
                  {doctors.map((doctor, index) => renderDoctorCard(doctor, index))}
                </View>
              ) : (
                <ThemedText style={styles.noDataText}>No doctors available at the moment.</ThemedText>
              )}
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Preferred Date</ThemedText>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerControls}>
                  <TouchableOpacity 
                    style={styles.dateControlButton}
                    onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() - 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                  <ThemedText style={styles.datePickerText}>
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </ThemedText>
                  <TouchableOpacity 
                    style={styles.dateControlButton}
                    onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() + 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <ThemedText style={styles.timeSectionTitle}>Preferred Time</ThemedText>
              <View style={styles.timeOptionsContainer}>
                <TouchableOpacity
                  style={[styles.timeOption, selectedTime === '09:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setSelectedTime('09:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, selectedTime === '09:00 AM' && styles.selectedTimeOptionText]}>
                    09:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, selectedTime === '10:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setSelectedTime('10:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, selectedTime === '10:00 AM' && styles.selectedTimeOptionText]}>
                    10:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, selectedTime === '11:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setSelectedTime('11:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, selectedTime === '11:00 AM' && styles.selectedTimeOptionText]}>
                    11:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, selectedTime === '02:00 PM' && styles.selectedTimeOption]}
                  onPress={() => setSelectedTime('02:00 PM')}
                >
                  <ThemedText style={[styles.timeOptionText, selectedTime === '02:00 PM' && styles.selectedTimeOptionText]}>
                    02:00 PM
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Additional Notes</ThemedText>
              <TextInput
                style={styles.notesInput}
                placeholder="Include any details about your appointment request..."
                placeholderTextColor="#9e9e9e"
                multiline
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Submit Request</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  doctorsList: {
    marginBottom: 8,
  },
  doctorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  selectedDoctorCard: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
  },
  doctorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedDoctorIconContainer: {
    backgroundColor: Colors.primary,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  doctorDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 8,
  },
  datePickerContainer: {
    marginBottom: 16,
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
    flex: 1,
    textAlign: 'center',
    color: 'black',
  },
  timeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeOption: {
    width: '48%',
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTimeOption: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
  },
  timeOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  selectedTimeOptionText: {
    fontWeight: 'bold',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    height: 100,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    color: Colors.textPrimary,
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginVertical: 24,
  },
}); 