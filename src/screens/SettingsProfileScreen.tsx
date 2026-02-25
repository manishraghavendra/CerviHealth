import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { signOut } from '../services/auth';
import { auth } from '../services/firebaseConfig';
import { getUserData } from '../services/firestore';

interface UserData {
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface SettingItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  action: () => void;
  type?: 'default' | 'destructive';
}

export default function SettingsProfileScreen() {
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userData = await getUserData(userId);
          if (userData) {
            const typedUserData = userData as UserData;
            setUserName(typedUserData.name || 'User');
            setUserEmail(typedUserData.email || '');
            setUserRole(typedUserData.role || '');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/auth-screen');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const settingItems: SettingItem[] = [
    {
      icon: 'person',
      title: 'Edit Profile',
      description: 'Update your personal information',
      action: () => {
        // Navigate to profile edit screen (not implemented yet)
        alert('Edit profile feature coming soon');
      }
    },
    {
      icon: 'notifications',
      title: 'Notification Settings',
      description: 'Manage your notification preferences',
      action: () => {
        // Navigate to notification settings screen (not implemented yet)
        alert('Notification settings feature coming soon');
      }
    },
    {
      icon: 'security',
      title: 'Privacy & Security',
      description: 'Manage your account security and privacy',
      action: () => {
        // Navigate to privacy settings screen (not implemented yet)
        alert('Privacy & Security feature coming soon');
      }
    },
    {
      icon: 'help',
      title: 'Help & Support',
      description: 'Get help and contact support',
      action: () => {
        // Navigate to help screen (not implemented yet)
        alert('Help & Support feature coming soon');
      }
    },
    {
      icon: 'info',
      title: 'About CerviHealth',
      description: 'Learn more about the app and its features',
      action: () => {
        // Navigate to about screen (not implemented yet)
        alert('About feature coming soon');
      }
    },
    {
      icon: 'logout',
      title: 'Log Out',
      action: handleLogout,
      type: 'destructive'
    }
  ];

  const renderSettingItem = (item: SettingItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.settingItem,
        index === settingItems.length - 1 && { borderBottomWidth: 0 }
      ]}
      onPress={item.action}
    >
      <View style={[
        styles.iconContainer,
        item.type === 'destructive' && styles.destructiveIconContainer
      ]}>
        <MaterialIcons
          name={item.icon}
          size={22}
          color={item.type === 'destructive' ? '#e74c3c' : Colors.primary}
        />
      </View>
      <View style={styles.settingTextContainer}>
        <ThemedText style={[
          styles.settingTitle,
          item.type === 'destructive' && styles.destructiveText
        ]}>
          {item.title}
        </ThemedText>
        {item.description && (
          <ThemedText style={styles.settingDescription}>{item.description}</ThemedText>
        )}
      </View>
      {item.type !== 'destructive' && (
        <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings & Profile</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="account-circle" size={80} color={Colors.primary} />
          </View>
          <ThemedText style={styles.userName}>{userName}</ThemedText>
          <ThemedText style={styles.userEmail}>{userEmail}</ThemedText>
          <View style={styles.roleBadge}>
            <ThemedText style={styles.roleText}>{userRole}</ThemedText>
          </View>
        </View>
        
        <View style={styles.settingsSection}>
          <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
          <View style={styles.settingsCard}>
            {settingItems.map(renderSettingItem)}
          </View>
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
    paddingHorizontal: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  destructiveIconContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  destructiveText: {
    color: '#e74c3c',
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
