import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    PanResponder,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth } from '../services/firebaseConfig';
import { getPatientWithDefaults, getScreeningRecord, getUserData } from '../services/firestore';
import { Screening } from '../types';

interface UserData {
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

// Extend the Screening interface to allow for symptoms data
interface ExtendedScreening extends Screening {
  symptoms?: string[];
}

// Extend the Patient interface to include medical information
interface ExtendedPatient {
  id: string;
  name: string;
  age: number;
  phoneNumber: string;
  medicalHistory: string;
  bloodGroup?: string;
  menstrualStatus?: string;
  symptoms?: string[];
}

export default function DoctorReportViewScreen() {
  const { screeningId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screening, setScreening] = useState<ExtendedScreening | null>(null);
  const [patient, setPatient] = useState<ExtendedPatient | null>(null);
  const [healthcareWorker, setHealthcareWorker] = useState<UserData | null>(null);
  const [doctor, setDoctor] = useState<UserData | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const currentScale = useRef(1);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const lastDistance = useRef(0);

  // Add a simple double tap implementation for another way to reset zoom
  let lastTap = 0;
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      resetZoom();
    }
    lastTap = now;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to movements if we're zoomed in or a multi-touch gesture
        const touches = evt.nativeEvent.touches.length;
        return touches > 1 || currentScale.current > 1.05;
      },
      onPanResponderGrant: (evt) => {
        // Capture current animated values
        scale.stopAnimation(value => { 
          currentScale.current = value; 
        });
        translateX.stopAnimation(value => { currentX.current = value; });
        translateY.stopAnimation(value => { currentY.current = value; });
        
        // Reset the last distance for new pinch gestures
        lastDistance.current = 0;
        
        // Handle double tap
        handleDoubleTap();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Handle pinch-to-zoom with two fingers
        if (evt.nativeEvent.touches.length >= 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          
          // Calculate current distance between fingers
          const dx = touch2.pageX - touch1.pageX;
          const dy = touch2.pageY - touch1.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Compare with the initial distance
          if (lastDistance.current === 0) {
            // Initialize distance on first move
            lastDistance.current = distance;
            return;
          }
          
          // Calculate the scale factor based on the change in distance
          const change = distance / lastDistance.current;
          const newScale = Math.max(1, Math.min(5, currentScale.current * change));
          
          // Apply the new scale
          scale.setValue(newScale);
          currentScale.current = newScale;
          
          // Update the last distance
          lastDistance.current = distance;
        } 
        // Handle panning when zoomed in
        else if (currentScale.current > 1.05) {
          translateX.setValue(currentX.current + gestureState.dx);
          translateY.setValue(currentY.current + gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        // Reset the last distance
        lastDistance.current = 0;
        
        // Snap back to bounds if zoomed out too much
        if (currentScale.current < 1.1) { 
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          currentScale.current = 1;
          currentX.current = 0;
          currentY.current = 0;
        }
      },
    })
  ).current;

  const resetZoom = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    currentScale.current = 1;
    currentX.current = 0;
    currentY.current = 0;
    lastDistance.current = 0;
  };

  useEffect(() => {
    const fetchScreeningDetails = async () => {
      if (!screeningId) {
        setError('No screening ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userData = await getUserData(userId);
          if (userData) {
            setCurrentUserRole((userData as UserData).role || '');
          }
        }

        const screeningData = await getScreeningRecord(screeningId as string);
        if (screeningData) {
          // Cast to ExtendedScreening to allow for symptoms field
          setScreening({ 
            id: screeningId as string, 
            ...(screeningData as any) 
          } as ExtendedScreening);
          
          if (screeningData.patientId) {
            const patientData = await getPatientWithDefaults(screeningData.patientId);
            if (patientData) {
              // Cast patientData to any to avoid TypeScript errors with property access
              const patientInfo = patientData as any;
              
              // Explicitly ensure all expected fields are present before setting state
              const patientWithDefaults: ExtendedPatient = {
                id: patientInfo.id || '',
                name: patientInfo.name || 'Unknown',
                age: patientInfo.age || 0,
                phoneNumber: patientInfo.phoneNumber || '',
                medicalHistory: patientInfo.medicalHistory || '',
                bloodGroup: patientInfo.bloodGroup || '',
                menstrualStatus: patientInfo.menstrualStatus || '',
                symptoms: patientInfo.symptoms || []
              };
              setPatient(patientWithDefaults);
            }
          }
          
          if (screeningData.healthcareWorkerId) {
            const hwData = await getUserData(screeningData.healthcareWorkerId);
            if (hwData) {
              setHealthcareWorker(hwData as UserData);
            }
          }
          
          if (screeningData.doctorId) {
            const doctorData = await getUserData(screeningData.doctorId);
            if (doctorData) {
              setDoctor(doctorData as UserData);
            }
          }
        } else {
          setError('Screening not found');
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error fetching screening details:', error.message);
        setError(`Failed to load report: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchScreeningDetails();
  }, [screeningId]);

  const handleBackNavigation = () => {
    if (currentUserRole === 'Patient') {
      router.push('/patient-home');
    } else if (currentUserRole === 'Healthcare Worker') {
      router.push('/healthcare-worker-home');
    } else if (currentUserRole === 'Doctor') {
      router.push('/pending-screenings');
    } else {
      router.back();
    }
  };

  const handleActionButton = () => {
    if (currentUserRole === 'Doctor' && (!screening?.reviewStatus || screening?.reviewStatus === 'Pending')) {
      router.push({
        pathname: '/review',
        params: { screeningId: screeningId }
      });
    } else if (currentUserRole === 'Patient') {
      router.push('/patient-home');
    } else if (currentUserRole === 'Healthcare Worker') {
      router.push('/healthcare-worker-home');
    } else if (currentUserRole === 'Doctor') {
      router.push('/pending-screenings');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
      case 'Reviewed':
        return '#2ecc71'; // Green
      case 'Uploaded':
        return '#f6bb42'; // Amber
      case 'Pending':
        return '#3498db'; // Blue
      case 'Normal':
        return '#2ecc71'; // Green
      case 'Abnormal':
        return '#e74c3c'; // Red
      default:
        return Colors.textSecondary;
    }
  };

  const renderScreeningImage = () => {
    if (!screening?.adjustedImageUrl && !screening?.imageUrl) {
      return (
        <View style={styles.noImageContainer}>
          <MaterialIcons name="image-not-supported" size={48} color={Colors.textSecondary} />
          <ThemedText style={styles.noImageText}>No image available</ThemedText>
        </View>
      );
    }
    
    const imageUri = screening.adjustedImageUrl || screening.imageUrl;
    
    return (
      <View style={styles.imageWrapper}>
        <View style={styles.touchableArea}>
          <Animated.View
            style={[
              styles.zoomContainer,
              {
                transform: [
                  { scale },
                  { translateX },
                  { translateY }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            <Image
              source={{ 
                uri: imageUri,
                cache: 'reload'
              }}
              style={styles.screeningImage}
              resizeMode="contain"
              onError={(error) => console.error('Image loading error:', error.nativeEvent.error)}
            />
          </Animated.View>
        </View>
        
        <View style={styles.imageControls}>
          <TouchableOpacity 
            style={styles.resetZoomButton} 
            onPress={resetZoom}
          >
            <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ThemedText style={styles.loadingText}>Loading screening report...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#e74c3c" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.actionButton} onPress={handleBackNavigation}>
          <ThemedText style={styles.actionButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackNavigation}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Screening Report</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.reportCard}>
          <ThemedText style={styles.sectionTitle}>Patient Information</ThemedText>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
              <ThemedText style={styles.detailLabel}>Patient:</ThemedText>
              <ThemedText style={styles.detailValue}>{patient?.name || 'Unknown'}</ThemedText>
            </View>
            
            {patient?.age && (
              <View style={styles.detailRow}>
                <MaterialIcons name="cake" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                <ThemedText style={styles.detailLabel}>Age:</ThemedText>
                <ThemedText style={styles.detailValue}>{patient.age} years</ThemedText>
              </View>
            )}
            
            {patient?.phoneNumber && (
              <View style={styles.detailRow}>
                <MaterialIcons name="phone" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                <ThemedText style={styles.detailLabel}>Phone:</ThemedText>
                <ThemedText style={styles.detailValue}>{patient.phoneNumber}</ThemedText>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <MaterialIcons name="event" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
              <ThemedText style={styles.detailLabel}>Date:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {screening?.createdAt ? formatDate(screening.createdAt) : 'Unknown'}
              </ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="medical-services" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
              <ThemedText style={styles.detailLabel}>Healthcare Worker:</ThemedText>
              <ThemedText style={styles.detailValue}>{healthcareWorker?.name || 'Unknown'}</ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="info" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
              <ThemedText style={styles.detailLabel}>Status:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: getStatusColor(screening?.status || '') }]}>
                {screening?.status || 'Unknown'}
              </ThemedText>
            </View>
          </View>
        </View>
        
        {/* Medical Information Section */}
        {(patient?.bloodGroup || patient?.menstrualStatus || (patient?.symptoms && patient.symptoms.length > 0) || patient?.medicalHistory) && (
          <View style={styles.reportCard}>
            <ThemedText style={styles.sectionTitle}>Medical Information</ThemedText>
            <View style={styles.detailsContainer}>
              {patient?.bloodGroup && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="bloodtype" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                  <ThemedText style={styles.detailLabel}>Blood Group:</ThemedText>
                  <ThemedText style={styles.detailValue}>{patient.bloodGroup}</ThemedText>
                </View>
              )}
              
              {patient?.menstrualStatus && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="favorite" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                  <ThemedText style={styles.detailLabel}>Menstrual Status:</ThemedText>
                  <ThemedText style={styles.detailValue}>{patient.menstrualStatus}</ThemedText>
                </View>
              )}
              
              {patient?.symptoms && patient.symptoms.length > 0 && (
                <View style={styles.symptomsContainer}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="healing" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                    <ThemedText style={styles.detailLabel}>Reported Symptoms:</ThemedText>
                  </View>
                  <View style={styles.symptomsGrid}>
                    {patient.symptoms.map((symptom, index) => (
                      <View key={index} style={styles.symptomTag}>
                        <ThemedText style={styles.symptomText}>{symptom}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {patient?.medicalHistory && (
                <View style={styles.medicalHistoryContainer}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="history" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                    <ThemedText style={styles.detailLabel}>Medical History:</ThemedText>
                  </View>
                  <View style={styles.medicalHistoryBox}>
                    <ThemedText style={styles.medicalHistoryText}>{patient.medicalHistory}</ThemedText>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.imageContainer}>
          <ThemedText style={styles.sectionTitle}>Screening Image</ThemedText>
          <ThemedText style={styles.zoomInstructions}>
            Pinch to zoom, drag to pan, double tap to reset
          </ThemedText>
          
          {renderScreeningImage()}
        </View>
        
        {screening?.reviewStatus && (
          <View style={styles.reviewCard}>
            <ThemedText style={styles.sectionTitle}>Doctor's Review</ThemedText>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <MaterialIcons name="assignment" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                <ThemedText style={styles.detailLabel}>Diagnosis:</ThemedText>
                <ThemedText style={[
                  styles.detailValue, 
                  { color: getStatusColor(screening.reviewStatus) }
                ]}>
                  {screening.reviewStatus}
                </ThemedText>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="person" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
                <ThemedText style={styles.detailLabel}>Reviewed by:</ThemedText>
                <ThemedText style={styles.detailValue}>{doctor?.name || 'Unknown doctor'}</ThemedText>
              </View>
              
              <View style={styles.commentsContainer}>
                <ThemedText style={styles.detailLabel}>Comments:</ThemedText>
                <ThemedText style={styles.commentsText}>
                  {screening.doctorComments || 'No comments provided.'}
                </ThemedText>
              </View>
            </View>
          </View>
        )}
        
        <TouchableOpacity style={styles.actionButton} onPress={handleActionButton}>
          <ThemedText style={styles.actionButtonText}>
            {currentUserRole === 'Doctor' && (!screening?.reviewStatus || screening?.reviewStatus === 'Pending') 
              ? 'Review Now' 
              : currentUserRole === 'Doctor' 
                ? 'Back to Pending Reports' 
                : 'Back to Home'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
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
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 24,
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
  content: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 8,
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  zoomInstructions: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 350,
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eaeaea',
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  zoomContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screeningImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  resetZoomButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reviewCard: {
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
  commentsContainer: {
    marginTop: 8,
  },
  commentsText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 4,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  symptomsContainer: {
    marginTop: 8,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  symptomTag: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 2,
  },
  symptomText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  medicalHistoryContainer: {
    marginTop: 8,
  },
  medicalHistoryBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  medicalHistoryText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});
