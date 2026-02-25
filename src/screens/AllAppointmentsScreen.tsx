import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth } from '../services/firebaseConfig';
import { getHealthcareWorkerAppointments, updateAppointmentStatus } from '../services/firestore';
import { Appointment } from '../types';

export default function AllAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'all'>('pending');

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      let appointmentsList;
      
      if (activeTab === 'pending') {
        appointmentsList = await getHealthcareWorkerAppointments(userId, 'Pending');
      } else if (activeTab === 'accepted') {
        appointmentsList = await getHealthcareWorkerAppointments(userId, ['Accepted', 'Rescheduled']);
      } else {
        appointmentsList = await getHealthcareWorkerAppointments(userId);
      }
      
      setAppointments(appointmentsList as Appointment[]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setLoading(false);
    }
  };

  const handleAcceptAppointment = async (appointment: Appointment) => {
    try {
      await updateAppointmentStatus(appointment.id!, 'Accepted', {
        updatedAt: Timestamp.now()
      });
      
      // Refresh appointments list
      fetchAppointments();
    } catch (error) {
      console.error('Error accepting appointment:', error);
    }
  };
  
  const handleCompleteAppointment = async (appointment: Appointment) => {
    try {
      await updateAppointmentStatus(appointment.id!, 'Completed', {
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Refresh appointments list
      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      await updateAppointmentStatus(selectedAppointment.id!, 'Rescheduled', {
        rescheduledDate: Timestamp.fromDate(rescheduleDate),
        appointmentTime: rescheduleTime,
        updatedAt: Timestamp.now()
      });
      
      // Refresh appointments list
      fetchAppointments();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
    }
  };

  const openRescheduleModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDate(new Date());
    setRescheduleTime('10:00 AM');
    setIsModalVisible(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#2ecc71'; // Green
      case 'Accepted':
        return '#3498db'; // Blue
      case 'Rescheduled':
        return '#9b59b6'; // Purple
      case 'Pending':
        return '#f6bb42'; // Amber
      case 'Cancelled':
        return '#e74c3c'; // Red
      default:
        return Colors.textSecondary;
    }
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentItem}>
      <View style={styles.appointmentHeader}>
        <ThemedText style={styles.patientName}>
          {item.patientName || 'Patient'} - ID: {item.patientId?.substring(0, 6) || 'N/A'}
        </ThemedText>
        <View style={[
          styles.statusBadge,
          { backgroundColor: `${getStatusColor(item.status)}20` }
        ]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.detailItem}>
          <MaterialIcons name="event" size={16} color={Colors.textSecondary} />
          <ThemedText style={styles.detailText}>
            Requested: {formatDate(item.requestedDate)}
          </ThemedText>
        </View>
        
        {item.rescheduledDate && (
          <View style={styles.detailItem}>
            <MaterialIcons name="update" size={16} color={Colors.textSecondary} />
            <ThemedText style={styles.detailText}>
              Rescheduled: {formatDate(item.rescheduledDate)}
            </ThemedText>
          </View>
        )}
        
        {item.appointmentTime && (
          <View style={styles.detailItem}>
            <MaterialIcons name="access-time" size={16} color={Colors.textSecondary} />
            <ThemedText style={styles.detailText}>
              Time: {item.appointmentTime}
            </ThemedText>
          </View>
        )}
      </View>
      
      {item.status === 'Pending' && (
        <View style={styles.appointmentActions}>
          <TouchableOpacity 
            style={[styles.appointmentButton, styles.acceptButton]}
            onPress={() => handleAcceptAppointment(item)}
          >
            <ThemedText style={styles.buttonActionText}>Accept</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.appointmentButton, styles.rescheduleButton]}
            onPress={() => openRescheduleModal(item)}
          >
            <ThemedText style={styles.buttonActionText}>Reschedule</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      
      {(item.status === 'Accepted' || item.status === 'Rescheduled') && (
        <View style={styles.appointmentActions}>
          <TouchableOpacity 
            style={[styles.appointmentButton, styles.completeButton]}
            onPress={() => handleCompleteAppointment(item)}
          >
            <ThemedText style={styles.buttonActionText}>Mark as Completed</ThemedText>
          </TouchableOpacity>
          {item.status !== 'Rescheduled' && (
            <TouchableOpacity 
              style={[styles.appointmentButton, styles.rescheduleButton]}
              onPress={() => openRescheduleModal(item)}
            >
              <ThemedText style={styles.buttonActionText}>Reschedule</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-busy" size={64} color="#e0e0e0" />
      <ThemedText style={styles.emptyText}>
        No {activeTab === 'all' ? '' : activeTab} appointments found
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Appointments</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
          onPress={() => setActiveTab('pending')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]} 
          onPress={() => setActiveTab('accepted')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
            Accepted
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <ThemedText style={styles.loadingText}>Loading appointments...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item, index): string => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ThemedText style={styles.modalTitle}>Reschedule Appointment</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Patient: {selectedAppointment?.patientName}
            </ThemedText>
            
            <View style={styles.datePickerContainer}>
              <ThemedText style={styles.datePickerLabel}>Date:</ThemedText>
              <View style={styles.datePickerControls}>
                <TouchableOpacity 
                  style={styles.dateControlButton}
                  onPress={() => {
                    const newDate = new Date(rescheduleDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setRescheduleDate(newDate);
                  }}
                >
                  <MaterialIcons name="chevron-left" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <ThemedText style={styles.datePickerText}>
                  {rescheduleDate.toLocaleDateString()}
                </ThemedText>
                <TouchableOpacity 
                  style={styles.dateControlButton}
                  onPress={() => {
                    const newDate = new Date(rescheduleDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setRescheduleDate(newDate);
                  }}
                >
                  <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.datePickerContainer}>
              <ThemedText style={styles.datePickerLabel}>Time:</ThemedText>
              <View style={styles.timePickerContainer}>
                <TouchableOpacity
                  style={[styles.timeOption, rescheduleTime === '09:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setRescheduleTime('09:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, rescheduleTime === '09:00 AM' && styles.selectedTimeOptionText]}>
                    09:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, rescheduleTime === '10:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setRescheduleTime('10:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, rescheduleTime === '10:00 AM' && styles.selectedTimeOptionText]}>
                    10:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, rescheduleTime === '11:00 AM' && styles.selectedTimeOption]}
                  onPress={() => setRescheduleTime('11:00 AM')}
                >
                  <ThemedText style={[styles.timeOptionText, rescheduleTime === '11:00 AM' && styles.selectedTimeOptionText]}>
                    11:00 AM
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeOption, rescheduleTime === '02:00 PM' && styles.selectedTimeOption]}
                  onPress={() => setRescheduleTime('02:00 PM')}
                >
                  <ThemedText style={[styles.timeOptionText, rescheduleTime === '02:00 PM' && styles.selectedTimeOptionText]}>
                    02:00 PM
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRescheduleAppointment}
              >
                <ThemedText style={styles.confirmButtonText}>Confirm</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: 'bold',
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  appointmentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  appointmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  rescheduleButton: {
    backgroundColor: '#f6bb42',
  },
  completeButton: {
    backgroundColor: '#3498db',
  },
  buttonActionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  datePickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  dateControlButton: {
    padding: 4,
  },
  datePickerText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeOption: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTimeOption: {
    backgroundColor: Colors.primary,
  },
  timeOptionText: {
    color: Colors.textPrimary,
  },
  selectedTimeOptionText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 