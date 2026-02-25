import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { auth } from '../services/firebaseConfig';
import { getUserData, getUserNotifications, markNotificationAsRead } from '../services/firestore';
import { Notification } from '../types';

interface UserData {
  role?: string;
  [key: string]: any;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          const userData = await getUserData(userId) as UserData;
          setCurrentUserRole(userData?.role || null);
          const notificationsList = await getUserNotifications(userId);
          setNotifications(notificationsList as Notification[]);
        } catch (error) {
          console.error('Error fetching initial data for notifications screen:', error);
        }
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.id) return;

    // Always mark notification as read when pressed
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Role-based navigation
    if (currentUserRole === 'Healthcare Worker') {
      // For HCW:
      // - Appointment notifications: only mark as read, no auto-navigation.
      // - Screening notifications (e.g. if a doctor reviewed their upload): navigate if screeningId exists.
      if ((notification.type === 'SCREENING_UPDATE' || notification.type === 'SCREENING_REVIEWED') && notification.data?.screeningId) {
        router.push({
          pathname: '/doctor-report-view' as any,
          params: { screeningId: notification.data.screeningId }
        });
      }
      // For other types like 'APPOINTMENT_REQUEST', 'APPOINTMENT_UPDATE', no automatic navigation for HCW.
    } else if (currentUserRole === 'Patient') {
      // For Patients:
      // - Screening notifications: navigate to report view if screeningId exists.
      // - Appointment notifications: only mark as read, no auto-navigation. Patient can view details from their appointment list.
      if ((notification.type === 'SCREENING_UPDATE' || notification.type === 'screening') && notification.data?.screeningId) {
        router.push({
          pathname: '/doctor-report-view' as any,
          params: { screeningId: notification.data.screeningId }
        });
      } 
      // For APPOINTMENT_UPDATE or appointment types, no automatic navigation for Patients from notifications.
    } else if (currentUserRole === 'Doctor') {
      // For Doctors (maintain potentially broader navigation, assuming /doctor-report-view is versatile for them):
      if ((notification.type === 'APPOINTMENT_UPDATE' || notification.type === 'appointment') && notification.data?.appointmentId) {
        router.push({
          pathname: '/doctor-report-view' as any, 
          params: { appointmentId: notification.data.appointmentId, screeningId: notification.data.screeningId } 
        });
      } else if ((notification.type === 'SCREENING_UPDATE' || notification.type === 'screening') && notification.data?.screeningId) {
        router.push({
          pathname: '/doctor-report-view' as any,
          params: { screeningId: notification.data.screeningId }
        });
      }
    } else {
      // Fallback for other roles or if role is not yet loaded (or if it's a shared notification type)
      // This retains the original broader logic but might still lead to issues if /doctor-report-view is too specific.
      // Consider a more generic approach or no navigation if role is unknown.
      if (notification.data?.screeningId) { // Prioritize screeningId if available
        router.push({
          pathname: '/doctor-report-view' as any,
          params: { screeningId: notification.data.screeningId }
        });
      } else if (notification.data?.appointmentId) {
         // If no screeningId, but appointmentId exists, try navigating (might still hit issues with /doctor-report-view)
        router.push({
          pathname: '/doctor-report-view' as any, 
          params: { appointmentId: notification.data.appointmentId }
        });
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Only mark unread notifications that have an id
      const unreadNotifications = notifications.filter(n => !n.read && n.id);
      
      // Update each notification
      for (const notification of unreadNotifications) {
        if (notification.id) {
          await markNotificationAsRead(notification.id);
        }
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      
      // If today, show only time
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
      
      // If this year, show month and day
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      }
      
      // Otherwise show full date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (err) {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'event';
      case 'screening':
        return 'photo-camera';
      case 'system':
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[
        styles.iconContainer, 
        { backgroundColor: item.read ? '#e0e0e0' : Colors.primary + '20' }
      ]}>
        <MaterialIcons 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={item.read ? Colors.textSecondary : Colors.primary} 
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <ThemedText style={[
            styles.notificationTitle,
            !item.read && styles.unreadNotificationText
          ]}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <ThemedText style={styles.notificationMessage}>
          {item.message}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color="#e0e0e0" />
      <ThemedText style={styles.emptyText}>No notifications</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
          {notifications.some(n => !n.read) && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <ThemedText style={styles.markAllText}>Mark all as read</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <ThemedText style={styles.loadingText}>Loading notifications...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id || `notification-${Math.random()}`}
          contentContainerStyle={styles.listContent}
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
    backgroundColor: '#f8f9fa',
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
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: Colors.primary,
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  unreadNotification: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  unreadNotificationText: {
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: Colors.textSecondary,
  },
});
