import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
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
import { getPatientWithDefaults, getScreeningRecord, getUserData, updateScreeningReview } from '../services/firestore';

const { width } = Dimensions.get('window');

interface ScreeningDetails {
  patientName: string;
  healthcareWorkerName: string;
  date: string;
  imageUrl: string;
}

interface PatientDetails {
  name: string;
  age: number;
  phoneNumber: string;
  email: string;
  address: string;
  bloodGroup: string;
  menstrualStatus: string;
  symptoms: string[];
  medicalHistory: string;
}

export default function ReviewScreen() {
  const { screeningId } = useLocalSearchParams<{ screeningId: string }>();
  const [screeningDetails, setScreeningDetails] = useState<ScreeningDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDiagnosisOptions, setShowDiagnosisOptions] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);

  useEffect(() => {
    const fetchScreeningData = async () => {
      try {
        if (!screeningId) {
          throw new Error('Screening ID is required');
        }

        setLoading(true);
        const screeningData = await getScreeningRecord(screeningId);
        
        if (!screeningData) {
          throw new Error('Screening data not found');
        }

        // Get patient data
        if (screeningData.patientId) {
          const patientData = await getPatientWithDefaults(screeningData.patientId);
          if (patientData) {
            const typedPatientData = patientData as any;
            setPatientDetails({
              name: typedPatientData.name || 'Unknown',
              age: typedPatientData.age || 0,
              phoneNumber: typedPatientData.phoneNumber || 'Not provided',
              email: typedPatientData.email || 'Not provided',
              address: typedPatientData.address || 'Not provided',
              bloodGroup: typedPatientData.bloodGroup || 'Not specified',
              menstrualStatus: typedPatientData.menstrualStatus || 'Not specified',
              symptoms: typedPatientData.symptoms || [],
              medicalHistory: typedPatientData.medicalHistory || 'No history provided',
            });
          }
        }

        // Get healthcare worker data
        const healthcareWorkerData = await getUserData(screeningData.healthcareWorkerId);
        if (!healthcareWorkerData) {
          throw new Error('Healthcare worker data not found');
        }

        // Format date
        const date = screeningData.createdAt 
          ? new Date(screeningData.createdAt.seconds * 1000).toLocaleDateString()
          : 'Unknown date';

        setScreeningDetails({
          patientName: (healthcareWorkerData as any).name || 'Unknown',
          healthcareWorkerName: (healthcareWorkerData as any).name || 'Unknown',
          date,
          imageUrl: screeningData.adjustedImageUrl || screeningData.imageUrl,
        });

        // Pre-fill diagnosis and comments if already reviewed
        if (screeningData.reviewStatus) {
          setDiagnosis(screeningData.reviewStatus);
        }
        
        if (screeningData.doctorComments) {
          setComments(screeningData.doctorComments);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching screening data:', err);
        setError('Failed to load screening data. Please try again.');
        setLoading(false);
      }
    };

    fetchScreeningData();
  }, [screeningId]);

  const handleSubmitReview = async () => {
    try {
      if (!screeningId) {
        throw new Error('Screening ID is required');
      }

      if (diagnosis === 'Pending') {
        setError('Please select a diagnosis');
        return;
      }

      const doctorId = auth.currentUser?.uid;
      if (!doctorId) {
        throw new Error('Doctor ID not found. Please log in again.');
      }

      setSubmitting(true);
      setError('');

      await updateScreeningReview(screeningId, diagnosis, comments, doctorId);

      setSuccess('Review submitted successfully!');
      
      // Show success message and navigate back after a delay
      setTimeout(() => {
        router.replace('/doctor-home');
      }, 2000);

    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPatientDetailRow = (label: string, value: string | number | string[]) => (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}:</ThemedText>
      <ThemedText style={styles.detailValue}>
        {Array.isArray(value) 
          ? (value.length > 0 ? value.join(', ') : 'None') 
          : value.toString()}
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <ThemedText style={styles.loadingText}>Loading screening data...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Review Screening</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.screeningInfoContainer}>
            <ThemedText style={styles.patientName}>{screeningDetails?.patientName}</ThemedText>
            <ThemedText style={styles.screeningDate}>Date: {screeningDetails?.date}</ThemedText>
            <ThemedText style={styles.healthcareWorker}>
              Healthcare Worker: {screeningDetails?.healthcareWorkerName}
            </ThemedText>
          </View>

          {/* Patient Details Section */}
          {patientDetails && (
            <View style={styles.patientDetailsContainer}>
              <ThemedText style={styles.sectionTitle}>Patient Details</ThemedText>
              
              {/* Personal Information */}
              <View style={styles.detailsSection}>
                <ThemedText style={styles.subsectionTitle}>Personal Information</ThemedText>
                {renderPatientDetailRow('Full Name', patientDetails.name)}
                {renderPatientDetailRow('Age', `${patientDetails.age} years`)}
                {renderPatientDetailRow('Phone Number', patientDetails.phoneNumber)}
              </View>

              {/* Medical Information */}
              <View style={styles.detailsSection}>
                <ThemedText style={styles.subsectionTitle}>Medical Information</ThemedText>
                {renderPatientDetailRow('Blood Group', patientDetails.bloodGroup)}
                {renderPatientDetailRow('Menstrual Status', patientDetails.menstrualStatus)}
              </View>

              {/* Symptoms */}
              <View style={styles.detailsSection}>
                <ThemedText style={styles.subsectionTitle}>Reported Symptoms</ThemedText>
                <View style={styles.symptomsContainer}>
                  {patientDetails.symptoms.length > 0 ? (
                    patientDetails.symptoms.map((symptom, index) => (
                      <View key={index} style={styles.symptomTag}>
                        <ThemedText style={styles.symptomText}>{symptom}</ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.detailValue}>No symptoms reported</ThemedText>
                  )}
                </View>
              </View>

              {/* Medical History */}
              <View style={styles.detailsSection}>
                <ThemedText style={styles.subsectionTitle}>Medical History</ThemedText>
                <View style={styles.medicalHistoryContainer}>
                  <ThemedText style={styles.medicalHistoryText}>
                    {patientDetails.medicalHistory || 'No medical history available'}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          <View style={styles.imageContainer}>
            {screeningDetails?.imageUrl ? (
              <Image 
                source={{ uri: screeningDetails.imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <MaterialIcons name="image" size={64} color="#e0e0e0" />
              </View>
            )}
          </View>

          <View style={styles.reviewFormContainer}>
            <ThemedText style={styles.sectionTitle}>Doctor's Review</ThemedText>
            
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Diagnosis</ThemedText>
              <TouchableOpacity
                style={styles.diagnosisButton}
                onPress={() => setShowDiagnosisOptions(!showDiagnosisOptions)}
              >
                <ThemedText style={styles.diagnosisButtonText}>
                  {diagnosis || 'Select Diagnosis'}
                </ThemedText>
                <MaterialIcons 
                  name={showDiagnosisOptions ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={Colors.textSecondary} 
                />
              </TouchableOpacity>
              
              {showDiagnosisOptions && (
                <View style={styles.diagnosisOptions}>
                  {['Normal', 'Abnormal', 'Pending'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.diagnosisOption,
                        diagnosis === option && styles.selectedDiagnosisOption
                      ]}
                      onPress={() => {
                        setDiagnosis(option);
                        setShowDiagnosisOptions(false);
                      }}
                    >
                      <ThemedText style={[
                        styles.diagnosisOptionText,
                        diagnosis === option && styles.selectedDiagnosisOptionText
                      ]}>
                        {option}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Comments</ThemedText>
              <TextInput
                style={styles.commentsInput}
                multiline
                numberOfLines={5}
                value={comments}
                onChangeText={setComments}
                placeholder="Add comments about the screening (optional)"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successContainer}>
              <ThemedText style={styles.successText}>{success}</ThemedText>
            </View>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmitReview}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <ThemedText style={styles.buttonText}>Submit Review</ThemedText>
                </>
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
    backgroundColor: '#f8f9fa',
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
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  screeningInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  screeningDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  healthcareWorker: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  patientDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsSection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    width: 120,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: 8,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  symptomTag: {
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  symptomText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  medicalHistoryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  medicalHistoryText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: width * 0.85,
    height: 300,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  diagnosisButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  diagnosisButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  diagnosisOptions: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  diagnosisOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  selectedDiagnosisOption: {
    backgroundColor: '#e3f2fd',
  },
  diagnosisOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  selectedDiagnosisOptionText: {
    fontWeight: 'bold',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    height: 120,
    textAlignVertical: 'top',
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    color: '#2ecc71',
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 32,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
