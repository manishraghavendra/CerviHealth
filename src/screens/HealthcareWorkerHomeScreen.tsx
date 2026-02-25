import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as Progress from 'react-native-progress';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { signOut } from '../services/auth';
import { auth, firestore } from '../services/firebaseConfig';
import {
  createNotification,
  getHealthcareWorkerAppointments,
  getPatient,
  getUserData,
  updateAppointmentStatus
} from '../services/firestore';
import { Appointment, Screening } from '../types';

// Define types for our data structures
interface UserData {
  name: string;
  email: string;
  role: string;
  userId?: string;
  [key: string]: any;
}

interface PatientDoc {
    id: string;
    userId: string;
    [key: string]: any;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
}

const { width } = Dimensions.get('window');

export default function HealthcareWorkerHomeScreen() {
  const [userName, setUserName] = useState('Healthcare Worker');
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [screeningStats, setScreeningStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredScreenings, setFilteredScreenings] = useState<Screening[]>([]);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userData = await getUserData(userId);
          if (userData) {
            setUserName((userData as UserData).name || 'Healthcare Worker');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
    fetchScreenings();
    fetchAppointments();
    fetchNotificationCount();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    if (!searchQuery.trim()) {
      setFilteredScreenings(screenings);
      return;
    }
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = screenings.filter(screening => {
      const patientNameMatch = screening.patientName?.toLowerCase().includes(lowerCaseQuery);
      const patientIdMatch = screening.patientId?.toLowerCase().includes(lowerCaseQuery);
      return patientNameMatch || patientIdMatch;
    });
    
    setFilteredScreenings(filtered);
  }, [searchQuery, screenings, loading]);

  const fetchScreenings = async () => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Query screenings created by this healthcare worker
      const screeningsQuery = query(
        collection(firestore, 'screenings'),
        where('healthcareWorkerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(screeningsQuery);
      const screeningsList: Screening[] = [];
      
      querySnapshot.forEach((doc) => {
        screeningsList.push({
          id: doc.id,
          ...doc.data()
        } as Screening);
      });
      
      setScreenings(screeningsList);
      
      // Get statistics
      const allScreeningsQuery = query(
        collection(firestore, 'screenings'),
        where('healthcareWorkerId', '==', userId)
      );
      
      const allScreeningsSnapshot = await getDocs(allScreeningsQuery);
      const totalScreenings = allScreeningsSnapshot.size;
      let completedScreenings = 0;
      
      allScreeningsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'Reviewed' || data.status === 'Uploaded') {
          completedScreenings++;
        }
      });
      
      setScreeningStats({
        total: totalScreenings,
        completed: completedScreenings,
        pending: totalScreenings - completedScreenings
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching screenings:', error);
      setError('Failed to load screenings');
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Use the service function to get appointments
      const appointmentsList = await getHealthcareWorkerAppointments(userId, 'Pending', 3);
      setAppointments(appointmentsList as Appointment[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) return;

      // Count unread notifications for this healthcare worker
      const notificationsQuery = query(
        collection(firestore, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      setNotificationCount(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/auth-screen');
    } catch (error) {
      console.error('Error signing out:', error);
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
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleAcceptAppointment = async (appointment: Appointment) => {
    try {
      await updateAppointmentStatus(appointment.id!, 'Accepted', {
        updatedAt: Timestamp.now()
      });
      
      // Notify patient
      if (appointment.patientId) {
        const patientDoc = await getPatient(appointment.patientId) as PatientDoc | null;
        if (patientDoc && patientDoc.userId) {
          const appointmentDate = appointment.requestedDate 
            ? formatDate(appointment.requestedDate) 
            : 'your scheduled date';
          await createNotification(
            patientDoc.userId,
            'APPOINTMENT_UPDATE',
            'Appointment Accepted',
            `Your appointment for ${appointmentDate} with ${userName} has been accepted.`,
            { appointmentId: appointment.id }
          );
        } else {
          console.warn('Could not send notification: Patient user ID not found for patientId:', appointment.patientId);
        }
      }

      // Refresh appointments list
      fetchAppointments();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error accepting appointment:', error);
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

      // Notify patient
      if (selectedAppointment.patientId) {
        const patientDoc = await getPatient(selectedAppointment.patientId) as PatientDoc | null;
        if (patientDoc && patientDoc.userId) {
          await createNotification(
            patientDoc.userId,
            'APPOINTMENT_UPDATE',
            'Appointment Rescheduled',
            `Your appointment with ${userName} has been rescheduled to ${rescheduleDate.toLocaleDateString()} at ${rescheduleTime}.`,
            { appointmentId: selectedAppointment.id }
          );
        } else {
          console.warn('Could not send notification: Patient user ID not found for patientId:', selectedAppointment.patientId);
        }
      }
      
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

  const showDateTimePicker = async () => {
    // Instead of using a native date picker, we'll use text input and simple date manipulation
    // This implementation is simplified for demonstration purposes
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 7); // Default to 7 days from now
    setRescheduleDate(newDate);
    
    // Default time (10:00 AM)
    setRescheduleTime('10:00 AM');
  };

  const renderStatCard = ({ title, value, icon, color }: StatCardProps) => (
    <View style={styles.statCard}>
      <View style={styles.statCardIconContainer}>
        <MaterialIcons name={icon} size={24} color={color || Colors.primary} />
      </View>
      <View style={styles.statCardContent}>
        <ThemedText style={styles.statTitle}>{title}</ThemedText>
        <ThemedText style={[styles.statValue, color && { color }]}>{value}</ThemedText>
      </View>
    </View>
  );

  const renderScreeningItem = ({ item }: { item: Screening }) => (
    <TouchableOpacity
      style={styles.screeningItem}
      onPress={() => {
        router.push({
          pathname: '/doctor-report-view' as any,
          params: { screeningId: item.id }
        });
      }}
    >
      <View>
        <ThemedText style={styles.patientName}>
          {item.patientName || 'Patient'} - ID: {item.patientId?.substring(0, 6) || 'N/A'}
        </ThemedText>
        <ThemedText style={styles.screeningDate}>Date: {formatDate(item.createdAt)}</ThemedText>
      </View>
      <View style={[
        styles.statusBadge,
        { 
          backgroundColor: item.status === 'Reviewed' 
            ? 'rgba(46, 204, 113, 0.2)' 
            : item.status === 'Uploaded' 
            ? 'rgba(246, 187, 66, 0.2)'
            : 'rgba(52, 152, 219, 0.2)' 
        }
      ]}>
        <ThemedText
          style={[
            styles.screeningStatus,
            { 
              color: item.status === 'Reviewed' 
                ? '#2ecc71' 
                : item.status === 'Uploaded' 
                ? '#f6bb42'
                : '#3498db' 
            },
          ]}
        >
          {item.status}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentItem}>
      <View>
        <ThemedText style={styles.patientName}>
          {item.patientName || 'Patient'} - ID: {item.patientId?.substring(0, 6) || 'N/A'}
        </ThemedText>
        <ThemedText style={styles.appointmentDate}>
          Requested: {formatDate(item.requestedDate)}
        </ThemedText>
      </View>
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
    </View>
  );

  const renderEmptyScreenings = () => {
    if (screenings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No recent screenings</ThemedText>
        </View>
      );
    } else if (searchQuery && filteredScreenings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={24} color={Colors.textSecondary} />
          <ThemedText style={styles.emptyText}>No screenings found matching "{searchQuery}"</ThemedText>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No recent screenings</ThemedText>
      </View>
    );
  };

  const renderEmptyAppointments = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>No pending appointments</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.welcomeText}>Welcome, {userName}</ThemedText>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/notifications' as any)}
            >
              <MaterialIcons name="notifications" size={24} color={Colors.textPrimary} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="power-settings-new" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>Dashboard</ThemedText>
          <View style={styles.statsContainer}>
            {renderStatCard({
              title: 'Total Patients',
              value: '150',
              icon: 'people',
              color: Colors.textSecondary,
            })}
            {renderStatCard({
              title: 'Screenings Today',
              value: '5',
              icon: 'today',
              color: Colors.textSecondary,
            })}
            {renderStatCard({
              title: 'Pending Reports',
              value: screeningStats.pending.toString(),
              icon: 'hourglass-empty',
              color: '#f6bb42',
            })}
          </View>
        </View>

        <View style={styles.screeningProgressSection}>
          <ThemedText style={styles.sectionTitle}>Screenings This Month</ThemedText>
          <View style={styles.screeningProgressContainer}>
            <View style={styles.progressChartContainer}>
              <Progress.Circle
                size={120}
                thickness={10}
                progress={screeningStats.total > 0 ? screeningStats.completed / screeningStats.total : 0}
                color="#3498db"
                unfilledColor="#e0e0e0"
                borderWidth={0}
                strokeCap="round"
              />
              <View style={styles.progressTextContainer}>
                <ThemedText style={styles.progressValue}>{screeningStats.completed}</ThemedText>
                <ThemedText style={styles.progressTotal}>/{screeningStats.total}</ThemedText>
              </View>
            </View>
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#3498db' }]} />
                <ThemedText style={styles.legendText}>Completed: {screeningStats.completed}</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#e0e0e0' }]} />
                <ThemedText style={styles.legendText}>Pending: {screeningStats.pending}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.screeningsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Screenings</ThemedText>
            <View style={styles.sectionHeaderActions}>
              <TouchableOpacity 
                style={styles.searchToggleButton} 
                onPress={() => setIsSearchVisible(!isSearchVisible)}
              >
                <MaterialIcons name="search" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/all-screenings' as any)}>
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          {isSearchVisible && (
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patient ID..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.textSecondary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIconContainer}>
                  <MaterialIcons name="cancel" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3498db" />
            </View>
          ) : (
            <FlatList
              data={searchQuery ? filteredScreenings : screenings}
              renderItem={renderScreeningItem}
              keyExtractor={(item) => String(item.id || `screening-${Date.now()}-${Math.random()}`)}
              scrollEnabled={false}
              ListEmptyComponent={renderEmptyScreenings}
            />
          )}
        </View>

        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Appointment Requests</ThemedText>
            <TouchableOpacity onPress={() => router.push('/all-appointments' as any)}>
              <ThemedText style={styles.viewAllText}>View All</ThemedText>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={appointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => String(item.id || `appointment-${Date.now()}-${Math.random()}`)}
            scrollEnabled={false}
            ListEmptyComponent={renderEmptyAppointments}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#3498db' }]}
            onPress={() => {
              // @ts-ignore - workaround for route type issue
              router.navigate("/new-patient-details");
            }}
          >
            <MaterialIcons name="person-add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Add Patient</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#9b59b6' }]}
            onPress={() => router.push('/all-screenings' as any)}
          >
            <MaterialIcons name="description" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>View Reports</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  notificationButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchToggleButton: {
    padding: 5,
    marginRight: 10,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
  },
  statsContainer: {
    flexDirection: 'column',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    width: '100%',
    marginBottom: 12,
  },
  statCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statCardContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  screeningProgressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  screeningProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressTextContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  progressTotal: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  progressLegend: {
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  screeningsSection: {
    marginBottom: 24,
  },
  appointmentsSection: {
    marginBottom: 24,
  },
  screeningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  appointmentItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  screeningDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  appointmentDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
  },
  screeningStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  appointmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  rescheduleButton: {
    backgroundColor: '#f6bb42',
  },
  buttonActionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  clearIconContainer: {
    padding: 5,
  },
})
