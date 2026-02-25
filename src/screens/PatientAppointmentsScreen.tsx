import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth } from '../services/firebaseConfig';
import { getPatientAppointments, getPatientDocIdByAuthUid, updateAppointmentStatus } from '../services/firestore';
import { Appointment } from '../types';

export default function PatientAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Get patient document ID
      const patientDocId = await getPatientDocIdByAuthUid(userId);
      
      if (!patientDocId) {
        setError('Patient information not found');
        return;
      }

      // Fetch appointments for this patient
      const userAppointments = await getPatientAppointments(patientDocId);
      
      setAppointments(userAppointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await updateAppointmentStatus(appointmentId, 'Cancelled');
              Alert.alert('Success', 'Appointment has been cancelled');
              fetchAppointments(); // Refresh the list
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#f39c12'; // Orange
      case 'Accepted':
        return '#2ecc71'; // Green
      case 'Rescheduled':
        return '#3498db'; // Blue
      case 'Completed':
        return '#9b59b6'; // Purple
      case 'Cancelled':
        return '#e74c3c'; // Red
      default:
        return Colors.textSecondary;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <ThemedText style={styles.appointmentDate}>{formatDate(item.requestedDate)}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons 
            name={item.type === 'doctor' ? 'medical-services' : 'person'} 
            size={16} 
            color={Colors.textSecondary} 
          />
          <ThemedText style={styles.detailText}>
            {item.type === 'doctor' ? 'Doctor' : 'Healthcare Worker'}: {item.providerName || (item.type === 'doctor' ? item.doctorName : item.healthcareWorkerName) || 'Unknown'}
          </ThemedText>
        </View>
        
        {item.appointmentTime && (
          <View style={styles.detailRow}>
            <MaterialIcons name="access-time" size={16} color={Colors.textSecondary} />
            <ThemedText style={styles.detailText}>{item.appointmentTime}</ThemedText>
          </View>
        )}
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <ThemedText style={styles.notesLabel}>Notes:</ThemedText>
            <ThemedText style={styles.notesText}>{item.notes}</ThemedText>
          </View>
        )}
      </View>
      
      {(item.status === 'Pending' || item.status === 'Accepted') && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelAppointment(item.id as string)}
        >
          <ThemedText style={styles.cancelButtonText}>Cancel Appointment</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>All Appointments</ThemedText>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={fetchAppointments} 
              style={styles.addButtonContainer}
            >
              <MaterialIcons name="refresh" size={20} color={Colors.primary} />
              <ThemedText style={styles.addButtonText}>Refresh</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/appointment-request')}
              style={styles.addButtonContainer}
            >
              <MaterialIcons name="local-hospital" size={20} color={Colors.primary} />
              <ThemedText style={styles.addButtonText}>Screening</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/doctor-appointment-request')}
              style={styles.addButtonContainer}
            >
              <MaterialIcons name="medical-services" size={20} color={Colors.primary} />
              <ThemedText style={styles.addButtonText}>Doctor</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAppointments}>
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={64} color={Colors.textSecondary} />
            <ThemedText style={styles.emptyText}>You don't have any appointments</ThemedText>
            <ThemedText style={styles.emptySubText}>
              Schedule a screening or doctor appointment using the buttons above
            </ThemedText>
            <View style={styles.emptyButtonsContainer}>
              <TouchableOpacity 
                style={[styles.scheduleButton, styles.screeningButton]}
                onPress={() => router.push('/appointment-request')}
              >
                <MaterialIcons name="local-hospital" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                <ThemedText style={styles.scheduleButtonText}>Screening</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.scheduleButton, styles.doctorButton]}
                onPress={() => router.push('/doctor-appointment-request')}
              >
                <MaterialIcons name="medical-services" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                <ThemedText style={styles.scheduleButtonText}>Doctor</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={appointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id as string}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  },
  headerButtons: {
    flexDirection: 'row',
  },
  addButtonContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  addButtonText: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#e74c3c',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 6,
    minWidth: 130,
  },
  screeningButton: {
    backgroundColor: '#3498db',
  },
  doctorButton: {
    backgroundColor: '#9b59b6',
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    color: 'black',
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: 'black',
  },
  notesText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
}); 