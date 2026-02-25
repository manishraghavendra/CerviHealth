import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { getPatient, getScreeningRecord, updateScreeningImage } from '../services/firestore';
import { Patient } from '../types';

interface CloudinaryTransformation {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
}

const { width } = Dimensions.get('window');

export default function ImageEnhancementScreen() {
  const { screeningId } = useLocalSearchParams<{ screeningId: string }>();
  const [transformations, setTransformations] = useState<CloudinaryTransformation>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
  });
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch screening data on load
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

        // Get patient name
        const patientData = await getPatient(screeningData.patientId);
        if (patientData) {
          setPatientName((patientData as Patient).name);
        }

        setOriginalImageUrl(screeningData.imageUrl);
        setPreviewUrl(screeningData.imageUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching screening data:', err);
        setError('Failed to load screening data. Please try again.');
        setLoading(false);
      }
    };

    fetchScreeningData();
  }, [screeningId]);

  // Update preview URL when transformations change
  useEffect(() => {
    if (!originalImageUrl) return;

    // Create Cloudinary transformation URL
    let transformationString = '';
    
    // Only add transformations that aren't at default values
    if (transformations.brightness !== 0) {
      transformationString += `e_brightness:${transformations.brightness},`;
    }
    
    if (transformations.contrast !== 0) {
      transformationString += `e_contrast:${transformations.contrast},`;
    }
    
    if (transformations.saturation !== 0) {
      transformationString += `e_saturation:${transformations.saturation},`;
    }
    
    if (transformations.sharpness !== 0) {
      transformationString += `e_sharpen:${transformations.sharpness},`;
    }

    // Remove trailing comma if present
    if (transformationString.endsWith(',')) {
      transformationString = transformationString.slice(0, -1);
    }

    // Cloudinary URL format: base_url/transformations/version/filename
    // Example: https://res.cloudinary.com/demo/image/upload/e_brightness:20,e_contrast:10/v123/sample.jpg
    if (transformationString) {
      // Extract version and filename from the original URL
      // This is a simplistic approach and might need adjustment based on your actual URL structure
      const urlParts = originalImageUrl.split('/upload/');
      if (urlParts.length === 2) {
        const newUrl = `${urlParts[0]}/upload/${transformationString}/${urlParts[1]}`;
        setPreviewUrl(newUrl);
      } else {
        setPreviewUrl(originalImageUrl);
      }
    } else {
      setPreviewUrl(originalImageUrl);
    }
  }, [transformations, originalImageUrl]);

  const resetTransformations = () => {
    setTransformations({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
    });
  };

  const handleConfirm = async () => {
    try {
      if (!screeningId) {
        throw new Error('Screening ID is required');
      }

      setSubmitting(true);
      setError('');

      // Only update if there are actual transformations
      const hasTransformations = 
        transformations.brightness !== 0 || 
        transformations.contrast !== 0 || 
        transformations.saturation !== 0 || 
        transformations.sharpness !== 0;

      // If no adjustments were made, use the original URL
      const finalImageUrl = hasTransformations ? previewUrl : originalImageUrl;

      // Update the screening record with the adjusted image URL
      await updateScreeningImage(screeningId, finalImageUrl);

      // Navigate to confirmation screen
      router.push({
        pathname: '/upload-confirmation',
        params: { screeningId }
      } as any);
    } catch (err) {
      console.error('Error saving enhanced image:', err);
      setError('Failed to save enhanced image. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlider = (
    label: string, 
    value: number, 
    onValueChange: (value: number) => void,
    minValue: number, 
    maxValue: number,
    step: number = 1
  ) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabelContainer}>
        <ThemedText style={styles.sliderLabel}>{label}</ThemedText>
        <ThemedText style={styles.sliderValue}>{value}</ThemedText>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minValue}
        maximumValue={maxValue}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor="#3498db"
        maximumTrackTintColor="#e0e0e0"
        thumbTintColor="#3498db"
      />
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <ThemedText style={styles.loadingText}>Loading image...</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Enhance Image</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.patientInfoContainer}>
          <ThemedText style={styles.patientName}>{patientName}</ThemedText>
        </View>

        <View style={styles.imageContainer}>
          {previewUrl ? (
            <Image 
              source={{ uri: previewUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <MaterialIcons name="image" size={64} color="#e0e0e0" />
            </View>
          )}
        </View>

        <View style={styles.adjustmentsContainer}>
          <ThemedText style={styles.sectionTitle}>Image Adjustments</ThemedText>
          
          {renderSlider(
            'Brightness', 
            transformations.brightness, 
            (value) => setTransformations(prev => ({ ...prev, brightness: value })),
            -100,
            100
          )}
          
          {renderSlider(
            'Contrast', 
            transformations.contrast, 
            (value) => setTransformations(prev => ({ ...prev, contrast: value })),
            -100,
            100
          )}
          
          {renderSlider(
            'Saturation', 
            transformations.saturation, 
            (value) => setTransformations(prev => ({ ...prev, saturation: value })),
            -100,
            100
          )}
          
          {renderSlider(
            'Sharpness', 
            transformations.sharpness, 
            (value) => setTransformations(prev => ({ ...prev, sharpness: value })),
            0,
            100
          )}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.resetButton]} 
            onPress={resetTransformations}
            disabled={submitting}
          >
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Reset</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton]} 
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <ThemedText style={styles.buttonText}>Confirm</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  patientInfoContainer: {
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
  adjustmentsContainer: {
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
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  slider: {
    width: '100%',
    height: 40,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButton: {
    backgroundColor: '#9b59b6',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#3498db',
    marginLeft: 8,
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
