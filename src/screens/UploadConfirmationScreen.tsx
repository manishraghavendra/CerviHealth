import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { getPatient, getScreeningRecord } from '../services/firestore';
import { Patient, Screening } from '../types';

export default function UploadConfirmationScreen() {
  const { screeningId } = useLocalSearchParams<{ screeningId: string }>();
  const [screening, setScreening] = useState<Screening | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // console.log('[UploadConfirmationScreen] Loaded with screeningId:', screeningId);
    const fetchData = async () => {
      if (!screeningId) {
        setError('Screening ID is missing');
        // console.error('[UploadConfirmationScreen] screeningId is undefined on load.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch screening data
        const screeningData = await getScreeningRecord(screeningId as string);
        if (!screeningData) {
          throw new Error('Screening not found');
        }
        
        setScreening({
          id: screeningId as string,
          ...screeningData
        } as Screening);

        // Fetch patient data
        if (screeningData.patientId) {
          const patientData = await getPatient(screeningData.patientId);
          if (patientData) {
            setPatient(patientData as Patient);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load screening details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [screeningId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleReturnHome = () => {
    // Reset navigation stack and navigate to home screen
    router.replace("/healthcare-worker-home" as any);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <ThemedText style={styles.loadingText}>Loading details...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace("/healthcare-worker-home" as any)}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Upload Confirmation</ThemedText>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : (
          <>
            <ThemedText style={styles.successMessage}>
              Image uploaded successfully!
            </ThemedText>
            
            <View style={styles.imageContainer}>
              {screening?.imageUrl ? (
                <Image 
                  source={{ uri: screening.imageUrl }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <MaterialIcons name="image" size={48} color="#cccccc" />
                  <ThemedText style={styles.placeholderText}>
                    Image not available
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.detailsContainer}>
              <ThemedText style={styles.detailsTitle}>Screening Details</ThemedText>
              
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Patient:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {patient?.name || 'Unknown'}
                </ThemedText>
              </View>
              
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Date:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {formatDate(screening?.createdAt)}
                </ThemedText>
              </View>
              
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Status:</ThemedText>
                <View style={styles.statusBadge}>
                  <ThemedText style={styles.statusText}>
                    {screening?.status || 'Unknown'}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Screening ID:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {screeningId}
                </ThemedText>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.returnButton}
              onPress={handleReturnHome}
            >
              <MaterialIcons name="home" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <ThemedText style={styles.buttonText}>
                Return to Home
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
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
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  successMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2ecc71',
    textAlign: 'center',
    marginVertical: 16,
  },
  imageContainer: {
    width: '90%',
    height: 300,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    marginVertical: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  returnButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
