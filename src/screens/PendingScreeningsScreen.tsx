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
import { getPendingScreenings, getScreeningRecord } from '../services/firestore';

interface ScreeningItem {
  id: string;
  patientName?: string;
  createdAt?: any;
  status: string;
}

export default function PendingScreeningsScreen() {
  const [screenings, setScreenings] = useState<ScreeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingScreenings();
  }, []);

  const fetchPendingScreenings = async () => {
    try {
      setLoading(true);
      const pendingScreenings = await getPendingScreenings();
      setScreenings(pendingScreenings);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pending screenings:', err);
      setError('Failed to load pending screenings. Please try again.');
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleScreeningSelect = async (screeningId: string) => {
    try {
      const screeningData = await getScreeningRecord(screeningId);
      
      // If the screening has already been reviewed, go to the report view
      if (screeningData && screeningData.status === 'Reviewed') {
        router.push({
          pathname: '/doctor-report-view' as any,
          params: { screeningId }
        });
      } else {
        // Otherwise, go to the review screen
        router.push({
          pathname: '/review' as any,
          params: { screeningId }
        });
      }
    } catch (error) {
      console.error('Error checking screening status:', error);
      // Fallback to review screen if there's an error
      router.push({
        pathname: '/review' as any,
        params: { screeningId }
      });
    }
  };

  const renderScreeningItem = ({ item }: { item: ScreeningItem }) => (
    <TouchableOpacity
      style={styles.screeningItem}
      onPress={() => handleScreeningSelect(item.id)}
    >
      <View>
        <ThemedText style={styles.patientName}>
          {item.patientName || 'Unknown Patient'}
        </ThemedText>
        <ThemedText style={styles.screeningDate}>
          Date: {formatDate(item.createdAt)}
        </ThemedText>
      </View>
      <View style={styles.statusBadge}>
        <ThemedText style={styles.statusText}>{item.status}</ThemedText>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="check-circle" size={64} color="#e0e0e0" />
      <ThemedText style={styles.emptyText}>
        No pending screenings to review
      </ThemedText>
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
          <ThemedText style={styles.headerTitle}>Pending Screenings</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <ThemedText style={styles.loadingText}>Loading screenings...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchPendingScreenings}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={screenings}
          renderItem={renderScreeningItem}
          keyExtractor={(item) => item.id}
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
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  screeningItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  screeningDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
}); 