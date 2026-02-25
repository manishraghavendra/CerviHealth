import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { uploadImage } from '../services/cloudinary';
import { auth, firestore } from '../services/firebaseConfig';
import { createNotification, createScreeningRecord, getPatient, getUserData } from '../services/firestore';
import { Screening } from '../types';

interface PatientDoc {
    id: string;
    userId: string;
    name?: string;
    [key: string]: any;
}

interface UserData {
    name?: string;
    // other relevant fields from your users collection if needed
}

export default function ImageCaptureScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // console.log('[ImageCaptureScreen] Loaded with patientId:', patientId);
    // Check camera permissions on component mount
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required to capture images');
      }
    })();
  }, [patientId]); // Added patientId to dependency array

  const handleCapture = async () => {
    try {
      setError('');
      
      // Launch camera to capture image
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error capturing image:', err);
      setError('Failed to capture image. Please try again.');
    }
  };

  const handleExternalCamera = async () => {
    try {
      setError('');
      
      // Show information dialog about external camera usage
      Alert.alert(
        'External Camera Instructions',
        'Please follow these steps to use your external camera:\n\n' +
        '1. Connect your external camera via USB Type-C\n' +
        '2. Use your device\'s camera app or a UVC camera app to take a photo\n' +
        '3. Save the image to your device\n' +
        '4. Click "Select Image" to choose the saved photo\n\n' +
        'Note: Make sure your external camera is UVC compatible.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Select Image',
            onPress: selectImageFromExternalCamera
          }
        ]
      );
    } catch (err) {
      console.error('Error with external camera:', err);
      setError('Failed to access external camera. Please try again.');
    }
  };

  const selectImageFromExternalCamera = async () => {
    try {
      // Launch document picker to select image files
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        
        // Verify it's an image file
        if (selectedFile.mimeType && selectedFile.mimeType.startsWith('image/')) {
          setImageUri(selectedFile.uri);
        } else {
          setError('Please select a valid image file (JPG, PNG, etc.)');
        }
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      setError('Failed to select image. Please try again.');
    }
  };

  const handleRetake = () => {
    setImageUri(null);
    setError('');
  };

  const handleUpload = async () => {
    // console.log('[ImageCaptureScreen] Attempting upload with patientId:', patientId);
    if (!imageUri) {
      setError('Please capture an image first');
      return;
    }

    if (!patientId) {
      setError('Patient information is missing');
      // console.error('[ImageCaptureScreen] patientId is missing during upload attempt.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get current user ID (healthcare worker)
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Upload image to Cloudinary
      const cloudinaryUrl = await uploadImage(imageUri);
      
      if (!cloudinaryUrl) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      // Prepare screening data
      const screeningData: Omit<Screening, 'id' | 'createdAt'> = {
        patientId,
        imageUrl: cloudinaryUrl,
        status: 'Uploaded',
        healthcareWorkerId: userId
      };

      // Save to Firestore
      const screeningId = await createScreeningRecord(screeningData);
      
      // Notify patient
      if (screeningId && screeningData.patientId) {
        try {
          const patientDoc = await getPatient(screeningData.patientId) as PatientDoc | null;
          if (patientDoc && patientDoc.userId) {
            await createNotification(
              patientDoc.userId,
              'SCREENING_UPLOADED',
              'New Screening Added',
              'A new screening image has been uploaded for you and is pending review.',
              { screeningId: screeningId, patientId: screeningData.patientId }
            );
          } else {
            console.warn('[ImageCaptureScreen] Could not send patient notification: Patient user ID not found for patientId:', screeningData.patientId);
          }
        } catch (notificationError) {
          console.error('[ImageCaptureScreen] Error sending patient screening added notification:', notificationError);
        }
      }

      // Notify all Doctors
      if (screeningId) {
        try {
          const hcwData = await getUserData(userId) as UserData | null;
          const hcwName = hcwData?.name || 'A Healthcare Worker';
          const patientDocForDoctorNotification = await getPatient(screeningData.patientId) as PatientDoc | null;
          const patientIdentifier = patientDocForDoctorNotification?.name || `Patient (ID: ${screeningData.patientId.substring(0,6)}...)`;

          const doctorsQuery = query(collection(firestore, "users"), where("role", "==", "Doctor"));
          const doctorsSnapshot = await getDocs(doctorsQuery);
          doctorsSnapshot.forEach(async (doctorDoc) => {
            if (doctorDoc.exists() && doctorDoc.id) {
              await createNotification(
                doctorDoc.id,
                'SCREENING_UPLOADED',
                'New Screening Ready for Review',
                `A new screening for ${patientIdentifier} has been uploaded by ${hcwName} and is ready for review.`,
                { screeningId: screeningId, patientId: screeningData.patientId }
              );
            }
          });
        } catch (doctorNotificationError) {
          console.error('[ImageCaptureScreen] Error sending new screening notification to doctors:', doctorNotificationError);
        }
      }

      // Navigate to image enhancement screen
      if (screeningId) {
        router.push({
          pathname: "/image-enhancement",
          params: { screeningId }
        } as any);
      } else {
        // console.error('[ImageCaptureScreen] Failed to get screeningId after saving. Navigation to confirmation aborted.');
        setError('Failed to proceed to enhancement. Screening ID not available.');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Capture Cervical Image</ThemedText>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewContainer}>
            {imageUri ? (
              <Image 
                source={{ uri: imageUri }} 
                style={styles.imagePreview} 
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <MaterialIcons name="photo-camera" size={48} color="#cccccc" />
                <ThemedText style={styles.placeholderText}>
                  No image captured
                </ThemedText>
              </View>
            )}
          </View>

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <View style={styles.buttonContainer}>
            {!imageUri ? (
              <>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCapture}
                >
                  <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <ThemedText style={styles.buttonText}>
                    Capture Image
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.externalCameraButton}
                  onPress={handleExternalCamera}
                >
                  <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <ThemedText style={styles.buttonText}>
                    Use External Camera
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleRetake}
                >
                  <MaterialIcons name="replay" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <ThemedText style={styles.buttonText}>
                    Retake Image
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUpload}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                      <ThemedText style={styles.buttonText}>
                        Upload Image
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  previewContainer: {
    width: '90%',
    height: 300,
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
  buttonContainer: {
    width: '90%',
    marginTop: 16,
    gap: 12,
  },
  captureButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalCameraButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
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
  errorText: {
    color: '#e74c3c',
    marginBottom: 16,
    fontSize: 14,
    alignSelf: 'flex-start',
    marginLeft: '5%',
  },
});
