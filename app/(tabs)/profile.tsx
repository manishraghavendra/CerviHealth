import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { signOut } from '../../src/services/auth';
import { auth } from '../../src/services/firebaseConfig';
import { getUserData } from '../../src/services/firestore';

interface UserProfile {
  name: string;
  email: string;
  role: 'patient' | 'healthcare-worker' | 'doctor';
  phoneNumber?: string;
  specialization?: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userData = await getUserData(userId);
          if (userData) {
            setProfile(userData as UserProfile);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/auth-screen');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderProfileItem = (icon: string, label: string, value?: string) => (
    <View style={styles.profileItem}>
      <MaterialIcons name={icon as any} size={24} color={Colors.primary} />
      <View style={styles.profileItemContent}>
        <ThemedText style={styles.profileLabel}>{label}</ThemedText>
        <ThemedText style={styles.profileValue}>{value || 'Not set'}</ThemedText>
      </View>
    </View>
  );

  if (!profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <TouchableOpacity onPress={() => router.push('/(tabs)/notifications')}>
          <MaterialIcons name="edit" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="account-circle" size={80} color={Colors.primary} />
        </View>
        <ThemedText style={styles.name}>{profile.name}</ThemedText>
        <ThemedText style={styles.role}>{profile.role.replace('-', ' ').toUpperCase()}</ThemedText>
      </View>

      <View style={styles.detailsSection}>
        {renderProfileItem('email', 'Email', profile.email)}
        {renderProfileItem('phone', 'Phone', profile.phoneNumber)}
        {profile.role === 'doctor' && renderProfileItem('medical-services', 'Specialization', profile.specialization)}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={24} color="#FFFFFF" />
        <ThemedText style={styles.logoutText}>Logout</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  detailsSection: {
    padding: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileItemContent: {
    marginLeft: 16,
    flex: 1,
  },
  profileLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    marginHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 