import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import {
  getScreeningsReviewedByDoctor,
  getUserData,
  updateDoctorScreeningReviewDetails,
} from '../services/firestore';

interface ScreeningItem {
  id: string;
  patientId?: string;
  patientName?: string;
  healthcareWorkerId?: string;
  healthcareWorkerName?: string;
  createdAt?: any;
  updatedAt?: any;
  reviewStatus?: 'Normal' | 'Abnormal' | 'Pending';
  doctorComments?: string;
  [key: string]: any; // Allow other properties from screening document
}

interface UserData {
  name: string;
  [key: string]: any;
}

export default function DoctorReviewedReportsScreen() {
  const [screenings, setScreenings] = useState<ScreeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Doctor');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingScreening, setEditingScreening] = useState<ScreeningItem | null>(null);
  const [currentReviewStatus, setCurrentReviewStatus] = useState<'Normal' | 'Abnormal' | 'Pending'>('Pending');
  const [currentDoctorComments, setCurrentDoctorComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredScreenings, setFilteredScreenings] = useState<ScreeningItem[]>([]);

  const fetchDoctorName = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userData = await getUserData(userId) as UserData;
      if (userData && userData.name) {
        setDoctorName(userData.name);
      }
    }
  }, []);

  const fetchReviewedScreenings = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const reviewedScreenings = await getScreeningsReviewedByDoctor(userId);
      setScreenings(reviewedScreenings);
      setError(null);
    } catch (err) {
      console.error('Error fetching reviewed screenings:', err);
      setError('Failed to load reviewed reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctorName();
    fetchReviewedScreenings();
  }, [fetchDoctorName, fetchReviewedScreenings]);

  useEffect(() => {
    if (loading) return;
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = screenings.filter(screening => {
      const patientNameMatch = screening.patientName?.toLowerCase().includes(lowerCaseQuery);
      const patientIdMatch = screening.patientId?.toLowerCase().includes(lowerCaseQuery);
      return patientNameMatch || patientIdMatch;
    });
    setFilteredScreenings(filtered);
  }, [searchQuery, screenings, loading]);

  const handleEditPress = (screening: ScreeningItem) => {
    setEditingScreening(screening);
    setCurrentReviewStatus(screening.reviewStatus || 'Pending');
    setCurrentDoctorComments(screening.doctorComments || '');
    setIsModalVisible(true);
  };

  const handleSaveChanges = async () => {
    if (!editingScreening || !editingScreening.id) return;

    setIsSubmitting(true);
    try {
      const success = await updateDoctorScreeningReviewDetails(
        editingScreening.id,
        currentReviewStatus,
        currentDoctorComments,
        editingScreening.healthcareWorkerId || '',
        doctorName,
        editingScreening.patientName || 'Patient'
      );
      if (success) {
        Alert.alert('Success', 'Review updated successfully.');
        setIsModalVisible(false);
        fetchReviewedScreenings(); // Refresh the list
      } else {
        Alert.alert('Error', 'Failed to update review.');
      }
    } catch (err) {
      console.error('Error updating review:', err);
      Alert.alert('Error', 'An error occurred while updating the review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const renderScreeningItem = ({ item }: { item: ScreeningItem }) => (
    <View style={styles.screeningItemContainer}>
      <View style={styles.screeningItemHeader}>
        <ThemedText style={styles.patientName}>{item.patientName || 'Unknown Patient'}</ThemedText>
        <ThemedText style={styles.dateText}>Reviewed: {formatDate(item.updatedAt)}</ThemedText>
      </View>
      <ThemedText style={styles.detailText}>Status: 
        <ThemedText style={{ fontWeight: 'bold', color: item.reviewStatus === 'Abnormal' ? Colors.error : Colors.success }}>
          {item.reviewStatus}
        </ThemedText>
      </ThemedText>
      <ThemedText style={styles.detailText}>Comments: {item.doctorComments || 'N/A'}</ThemedText>
      <ThemedText style={styles.detailTextSmall}>Original HCW: {item.healthcareWorkerName || 'N/A'}</ThemedText>
      <TouchableOpacity style={styles.editButton} onPress={() => handleEditPress(item)}>
        <MaterialIcons name="edit" size={20} color={Colors.primary} />
        <ThemedText style={styles.editButtonText}>Edit Review</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyListComponent = () => {
    if (screenings.length === 0) {
      return (
        <View style={styles.centeredViewEmptyList}>
          <MaterialIcons name="folder-off" size={64} color={Colors.textSecondary} />
          <ThemedText style={styles.emptyText}>No reports reviewed by you yet.</ThemedText>
        </View>
      );
    } else if (searchQuery && filteredScreenings.length === 0) {
      return (
        <View style={styles.centeredViewEmptyList}>
          <MaterialIcons name="search-off" size={64} color={Colors.textSecondary} />
          <ThemedText style={styles.emptyText}>No reports found matching "{searchQuery}".</ThemedText>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ThemedText>Loading reviewed reports...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredView}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity onPress={fetchReviewedScreenings} style={styles.retryButton}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Patient Name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIconContainer}>
            <MaterialIcons name="cancel" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredScreenings}
        renderItem={renderScreeningItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyListComponent}
      />

      {editingScreening && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => {
            setIsModalVisible(false);
            setEditingScreening(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <ThemedText style={styles.modalTitle}>Edit Review for {editingScreening.patientName}</ThemedText>
                
                <ThemedText style={styles.modalLabel}>Review Status:</ThemedText>
                <View style={styles.statusToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      currentReviewStatus === 'Normal' && styles.statusButtonActive,
                      { backgroundColor: currentReviewStatus === 'Normal' ? Colors.success : Colors.background }
                    ]}
                    onPress={() => setCurrentReviewStatus('Normal')}
                  >
                    <ThemedText style={currentReviewStatus === 'Normal' ? styles.statusButtonTextActive : styles.statusButtonText}>
                      Normal
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      currentReviewStatus === 'Abnormal' && styles.statusButtonActive,
                      { backgroundColor: currentReviewStatus === 'Abnormal' ? Colors.error : Colors.background }
                    ]}
                    onPress={() => setCurrentReviewStatus('Abnormal')}
                  >
                    <ThemedText style={currentReviewStatus === 'Abnormal' ? styles.statusButtonTextActive : styles.statusButtonText}>
                      Abnormal
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.modalLabel}>Doctor Comments (Optional):</ThemedText>
                <TextInput
                  style={styles.modalTextInput}
                  value={currentDoctorComments}
                  onChangeText={setCurrentDoctorComments}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter your comments..."
                />

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, isSubmitting && styles.disabledButton]}
                  onPress={handleSaveChanges}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.modalButtonText}>Save Changes</ThemedText>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Replaced Colors.lightGrey
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
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
    height: 45,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  clearIconContainer: {
    padding: 5,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  screeningItemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  screeningItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailTextSmall: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e0e0e0', // Replaced Colors.primaryMuted
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  editButtonText: {
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: Platform.OS === 'web' ? '50%' : '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  modalLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 10,
  },
  statusToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cccccc', // Replaced Colors.border
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statusButtonActive: {
    borderColor: Colors.primary,
  },
  statusButtonText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  statusButtonTextActive: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#cccccc', // Replaced Colors.border
    borderRadius: 8,
    padding: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#f5f5f5', // Replaced Colors.backgroundMuted
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.textSecondary,
  },
  disabledButton: {
    opacity: 0.7,
  },
  centeredViewEmptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
}); 