import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth, firestore } from '../services/firebaseConfig';
import { getPatientDocIdByAuthUid, getPatientWithDefaults, getUserData } from '../services/firestore';

interface Screening {
  id: string;
  patientId: string;
  patientName?: string;
  imageUrl: string;
  adjustedImageUrl?: string;
  status: 'Pending' | 'Uploaded' | 'Reviewed' | 'Normal' | 'Abnormal';
  reviewStatus?: 'Normal' | 'Abnormal' | 'Pending';
  createdAt: any;
  patientAge?: number;
  bloodGroup?: string;
  menstrualStatus?: string;
  symptoms?: string[];
  medicalHistory?: string;
}

interface UserData {
  role?: string;
  // Add other user data fields if needed
}

export default function AllScreeningsScreen() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [screenTitle, setScreenTitle] = useState('All Screenings');

  // Optional: if you need to pass a specific patientId for a patient context
  // const params = useLocalSearchParams<{ patientId?: string }>();

  useEffect(() => {
    const initializeScreen = async () => {
      setLoading(true);
      const authUid = auth.currentUser?.uid;
      if (authUid) {
        const userData = await getUserData(authUid) as UserData;
        const role = userData?.role;
        setUserRole(role || null);

        if (role === 'Patient') {
          setScreenTitle('My Screening Reports');
          const patientDocId = await getPatientDocIdByAuthUid(authUid);
          if (patientDocId) {
            fetchPatientScreenings(patientDocId);
          } else {
            setError('Could not find patient record.');
            setLoading(false);
          }
        } else if (role === 'Healthcare Worker' || role === 'Doctor') {
          // Doctors might see all or based on other criteria - for now, same as HCW
          setScreenTitle(role === 'Doctor' ? 'All Submitted Screenings' : 'My Uploaded Screenings');
          fetchHealthcareWorkerScreenings(authUid);
        } else {
          setError('User role not recognized or user not authenticated.');
          setLoading(false);
        }
      } else {
        setError('User not authenticated.');
        setLoading(false);
      }
    };
    initializeScreen();
  }, []);

  const fetchPatientScreenings = async (patientDocId: string) => {
    try {
      const screeningsQuery = query(
        collection(firestore, 'screenings'),
        where('patientId', '==', patientDocId),
        orderBy('createdAt', 'desc')
      );
      processQuerySnapshot(screeningsQuery);
    } catch (err) {
      console.error('Error fetching patient screenings:', err);
      setError('Failed to load your screenings. Please try again.');
      setLoading(false);
    }
  };

  const fetchHealthcareWorkerScreenings = async (hcwId: string) => {
    try {
      const screeningsQuery = query(
        collection(firestore, 'screenings'),
        where('healthcareWorkerId', '==', hcwId),
        orderBy('createdAt', 'desc')
      );
      processQuerySnapshot(screeningsQuery);
    } catch (err) {
      console.error('Error fetching healthcare worker screenings:', err);
      setError('Failed to load screenings. Please try again.');
      setLoading(false);
    }
  };
  
  const processQuerySnapshot = async (queryToProcess: any) => {
    const querySnapshot = await getDocs(queryToProcess);
    const screeningsList: Screening[] = [];
    
    for (const doc of querySnapshot.docs) {
      const docData = doc.data() as any;
      const screeningData: Screening = {
        id: doc.id,
        patientId: docData.patientId || '',
        patientName: docData.patientName,
        imageUrl: docData.imageUrl || '',
        adjustedImageUrl: docData.adjustedImageUrl,
        status: docData.status || 'Pending',
        reviewStatus: docData.reviewStatus,
        createdAt: docData.createdAt,
      };
      
      // Fetch patient medical details
      if (screeningData.patientId) {
        try {
          const patientData = await getPatientWithDefaults(screeningData.patientId);
          if (patientData) {
            const typedPatientData = patientData as any;
            screeningData.patientAge = typedPatientData.age;
            screeningData.bloodGroup = typedPatientData.bloodGroup;
            screeningData.menstrualStatus = typedPatientData.menstrualStatus;
            screeningData.symptoms = typedPatientData.symptoms;
            screeningData.medicalHistory = typedPatientData.medicalHistory;
            if (!screeningData.patientName) {
              screeningData.patientName = typedPatientData.name;
            }
          }
        } catch (error) {
          console.error('Error fetching patient details for screening:', error);
        }
      }
      
      screeningsList.push(screeningData);
    }
    
    setScreenings(screeningsList);
    setLoading(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return 'Unknown date';
    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      console.error("Error formatting date:", err);
      return 'Invalid date';
    }
  };

  const getStatusDisplay = (item: Screening): string => {
    return item.reviewStatus ? item.reviewStatus : item.status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Reviewed': //This status might not be used if reviewStatus is present
      case 'Normal':
        return '#2ecc71'; // Green
      case 'Abnormal':
        return '#e74c3c'; // Red
      case 'Uploaded':
      case 'Pending': // Assuming Pending review status is the same color as Uploaded
        return '#f39c12'; // Amber/Orange - Changed from f6bb42 for better contrast
      default:
        return Colors.textSecondary;
    }
  };

  const renderScreeningItem = ({ item }: { item: Screening }) => {
    const displayStatus = getStatusDisplay(item);
    const statusColor = getStatusColor(displayStatus);

    return (
      <TouchableOpacity
        style={styles.screeningItem}
        onPress={() => router.push({
          pathname: '/doctor-report-view',
          params: { screeningId: item.id }
        })}
      >
        <View style={styles.screeningInfo}>
          <ThemedText style={styles.patientName}>
            {item.patientName || `Patient ID: ${item.patientId.substring(0,8)}...`}
          </ThemedText>
          <ThemedText style={styles.screeningDate}>
            Date: {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: `${statusColor}20` } // Slight opacity for badge background
        ]}>
          <ThemedText style={[
            styles.statusText,
            { color: statusColor }
          ]}>
            {displayStatus}
          </ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="info-outline" size={64} color="#e0e0e0" />
      <ThemedText style={styles.emptyText}>
        No screening reports found.
      </ThemedText>
      {userRole === 'Patient' && (
         <ThemedText style={styles.emptySubText}>Once you have a screening, it will appear here.</ThemedText>
      )}
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
          <ThemedText style={styles.headerTitle}>{screenTitle}</ThemedText>
          <View style={{ width: 24 }} />{/* Spacer */}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <ThemedText style={styles.loadingText}>Loading reports...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              // Re-trigger fetching logic based on role
              const authUid = auth.currentUser?.uid;
              if (authUid) {
                if (userRole === 'Patient') {
                  getPatientDocIdByAuthUid(authUid).then(docId => {
                    if (docId) fetchPatientScreenings(docId);
                  });
                } else if (userRole === 'Healthcare Worker' || userRole === 'Doctor') {
                  fetchHealthcareWorkerScreenings(authUid);
                }
              }
            }}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={screenings}
          renderItem={renderScreeningItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={screenings.length === 0 ? styles.emptyListContainer : styles.listContent}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 25 : 60, // Adjust for status bar
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF', // Fallback for headerBackground
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Fallback for border
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  backButton: {
    padding: 8, // Increased touchable area
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.error, // Use existing error color
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    elevation: 2,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1, // Ensure empty component takes full space if needed
    justifyContent: 'center',
    alignItems: 'center',
  },
  screeningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Fallback for cardBackground
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  screeningInfo: {
    flex: 1, // Allow text to take available space and wrap if necessary
    marginRight: 10,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15, // More rounded badge
    marginLeft: 10, // Give some space from text
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
   emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary, // Use existing textSecondary
    marginTop: 8,
    textAlign: 'center',
  },
}); 