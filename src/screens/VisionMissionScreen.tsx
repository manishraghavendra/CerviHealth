import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

const { width, height } = Dimensions.get('window');

export default function VisionMissionScreen() {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to auth screen after 4 seconds
    const timer = setTimeout(() => {
      router.replace('/auth-screen');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons name="health-and-safety" size={60} color="#FFFFFF" />
          </View>

          {/* Mission Section */}
          <View style={styles.section}>
            <View style={styles.titleContainer}>
              <MaterialIcons name="flag" size={24} color="#FFD700" />
              <ThemedText style={styles.sectionTitle}>Our Mission</ThemedText>
            </View>
            <ThemedText style={styles.missionText}>
              We strive to transform rural healthcare by equipping frontline health workers with an intelligent, app-based cervical screening system — enabling real-time image capture, secure cloud sharing, and specialist-reviewed diagnosis right at their fingertips.
            </ThemedText>
          </View>

          {/* Vision Section */}
          <View style={styles.section}>
            <View style={styles.titleContainer}>
              <MaterialIcons name="visibility" size={24} color="#FFD700" />
              <ThemedText style={styles.sectionTitle}>Our Vision</ThemedText>
            </View>
            <ThemedText style={styles.visionText}>
              Cervical cancer is the 4th most common cancer among women worldwide. We aim to make early cervical cancer detection a basic right — not a privilege — by delivering affordable, Android-based colposcope solutions that reach every woman, no matter where she lives.
            </ThemedText>
          </View>

          {/* Bottom Branding */}
          <View style={styles.brandingContainer}>
            <ThemedText style={styles.appName}>CerviHealth</ThemedText>
            <ThemedText style={styles.tagline}>Empowering Healthcare, Saving Lives</ThemedText>
          </View>
        </Animated.View>
      </LinearGradient>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  iconContainer: {
    marginBottom: 40,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  section: {
    marginBottom: 40,
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    textAlign: 'center',
  },
  missionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
    fontWeight: '400',
  },
  visionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
    fontWeight: '400',
  },
  brandingContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 