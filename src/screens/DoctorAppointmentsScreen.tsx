import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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
import { createAppointmentNotification, getDoctorAppointments, updateAppointmentStatus } from '../services/firestore';

// Define types for our data structures
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  requestedDate: any; // Firebase timestamp
  notes?: string;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Completed' | 'Cancelled';
  type: 'doctor';
  createdAt?: any;
  updatedAt?: any;
}

export default function DoctorAppointmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [processingResponse, setProcessingResponse] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (filter === 'All') {
      setFilteredAppointments(appointments);
    } else {
      const filtered = appointments.filter(appointment => appointment.status === filter);
      setFilteredAppointments(filtered);
    }
  }, [filter, appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (userId) {
        const doctorAppointments = await getDoctorAppointments(userId);
        setAppointments(doctorAppointments as Appointment[]);
        setFilteredAppointments(doctorAppointments as Appointment[]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentResponse = async (appointmentId: string, status: 'Accepted' | 'Declined' | 'Completed') => {
    try {
      setProcessingResponse(true);
      
      // Update appointment status in Firestore
      await updateAppointmentStatus(appointmentId, status, {
        doctorMessage: responseMessage.trim()
      });
      
      // Create notification for the patient
      if (selectedAppointment) {
        const notificationTitle = status === 'Accepted' 
          ? 'Appointment Accepted' 
          : status === 'Declined' 
          ? 'Appointment Declined'
          : 'Appointment Completed';
        
        const notificationMessage = status === 'Accepted'
          ? 'Your appointment request has been accepted.'
          : status === 'Declined'
          ? 'Your appointment request has been declined.'
          : 'Your appointment has been marked as completed.';
        
        await createAppointmentNotification(
          selectedAppointment.patientId,
          notificationTitle,
          responseMessage.trim() 
            ? `${notificationMessage} Message: ${responseMessage}`
            : notificationMessage,
          appointmentId
        );
      }
      
      // Update local state
      const updatedAppointments = appointments.map(appointment => 
        appointment.id === appointmentId
          ? { ...appointment, status }
          : appointment
      );
      
      setAppointments(updatedAppointments);
      
      // Close modal
      setResponseModalVisible(false);
      setResponseMessage('');
      setSelectedAppointment(null);
      
      Alert.alert('Success', `Appointment ${status.toLowerCase()} successfully.`);
    } catch (error) {
      console.error('Error responding to appointment:', error);
      Alert.alert('Error', 'Failed to update appointment. Please try again.');
    } finally {
      setProcessingResponse(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#f39c12'; // amber
      case 'Accepted':
        return '#2ecc71'; // green
      case 'Declined':
        return '#e74c3c'; // red
      case 'Completed':
        return '#3498db'; // blue
      case 'Cancelled':
        return '#95a5a6'; // gray
      default:
        return Colors.textSecondary;
    }
  };

  const renderFilterButton = (filterName: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterName && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterName)}
    >
      <ThemedText style={[
        styles.filterButtonText,
        filter === filterName && styles.filterButtonTextActive
      ]}>
        {filterName}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      style={styles.appointmentItem}
      onPress={() => {
        setSelectedAppointment(item);
        setDetailsModalVisible(true);
      }}
    >
      <View style={styles.appointmentHeader}>
        <ThemedText style={styles.patientName}>{item.patientName}</ThemedText>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) + '20' } // adding transparency
        ]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color={Colors.textSecondary} />
          <ThemedText style={styles.detailText}>
            {formatDate(item.requestedDate)}
          </ThemedText>
        </View>
        
        {item.notes && (
          <View style={styles.detailRow}>
            <MaterialIcons name="notes" size={16} color={Colors.textSecondary} />
            <ThemedText style={styles.detailText} numberOfLines={1}>
              {item.notes}
            </ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={detailsModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Appointment Details</ThemedText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {selectedAppointment && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <ThemedText style={styles.detailLabel}>Patient:</ThemedText>
                <ThemedText style={styles.detailValue}>{selectedAppointment.patientName}</ThemedText>
              </View>
              
              <View style={styles.detailSection}>
                <ThemedText style={styles.detailLabel}>Status:</ThemedText>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(selectedAppointment.status) + '20' }
                ]}>
                  <ThemedText style={[styles.statusText, { color: getStatusColor(selectedAppointment.status) }]}>
                    {selectedAppointment.status}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.detailSection}>
                <ThemedText style={styles.detailLabel}>Requested Date:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {formatDate(selectedAppointment.requestedDate)}
                </ThemedText>
              </View>
              
              {selectedAppointment.notes && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.detailLabel}>Notes:</ThemedText>
                  <ThemedText style={styles.detailValue}>{selectedAppointment.notes}</ThemedText>
                </View>
              )}
              
              {selectedAppointment.status === 'Pending' && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setResponseModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="check" size={20} color="#fff" style={styles.actionButtonIcon} />
                    <ThemedText style={styles.actionButtonText}>Respond</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
              
              {selectedAppointment.status === 'Accepted' && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => {
                      Alert.alert(
                        'Complete Appointment',
                        'Are you sure you want to mark this appointment as completed?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Complete',
                            onPress: () => {
                              setDetailsModalVisible(false);
                              handleAppointmentResponse(selectedAppointment.id, 'Completed');
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <MaterialIcons name="check-circle" size={20} color="#fff" style={styles.actionButtonIcon} />
                    <ThemedText style={styles.actionButtonText}>Mark as Completed</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderResponseModal = () => (
    <Modal
      visible={responseModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setResponseModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Respond to Appointment</ThemedText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setResponseModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.responseSection}>
              <ThemedText style={styles.responseLabel}>Response Message (Optional):</ThemedText>
              <TextInput
                style={styles.responseInput}
                placeholder="Add a message for the patient..."
                placeholderTextColor="#9e9e9e"
                multiline
                value={responseMessage}
                onChangeText={setResponseMessage}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.responseButtonsContainer}>
              <TouchableOpacity
                style={[styles.responseButton, styles.declineButton]}
                onPress={() => selectedAppointment && handleAppointmentResponse(selectedAppointment.id, 'Declined')}
                disabled={processingResponse}
              >
                {processingResponse ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="close" size={20} color="#fff" style={styles.responseButtonIcon} />
                    <ThemedText style={styles.responseButtonText}>Decline</ThemedText>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.responseButton, styles.acceptResponseButton]}
                onPress={() => selectedAppointment && handleAppointmentResponse(selectedAppointment.id, 'Accepted')}
                disabled={processingResponse}
              >
                {processingResponse ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" style={styles.responseButtonIcon} />
                    <ThemedText style={styles.responseButtonText}>Accept</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ThemedText style={styles.loadingText}>Loading appointments...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Appointments</ThemedText>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchAppointments}>
          <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScrollView}>
          {renderFilterButton('All')}
          {renderFilterButton('Pending')}
          {renderFilterButton('Accepted')}
          {renderFilterButton('Completed')}
          {renderFilterButton('Declined')}
        </ScrollView>
      </View>
      
      {filteredAppointments.length > 0 ? (
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.appointmentsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="event-busy" size={64} color="#e0e0e0" />
          <ThemedText style={styles.emptyText}>
            No {filter !== 'All' ? filter.toLowerCase() : ''} appointments found
          </ThemedText>
        </View>
      )}
      
      {renderDetailsModal()}
      {renderResponseModal()}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  filtersScrollView: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  appointmentsList: {
    padding: 16,
  },
  appointmentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  actionButtonsContainer: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  completeButton: {
    backgroundColor: '#2ecc71',
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  responseSection: {
    marginBottom: 16,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  responseButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  responseButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  declineButton: {
    backgroundColor: '#e74c3c',
  },
  acceptResponseButton: {
    backgroundColor: '#2ecc71',
  },
  responseButtonIcon: {
    marginRight: 8,
  },
  responseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 