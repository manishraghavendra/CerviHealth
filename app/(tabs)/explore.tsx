import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';

interface Report {
  id: string;
  patientName: string;
  date: string;
  status: 'Normal' | 'Abnormal' | 'Pending Review';
}

// Placeholder data for reports
const PLACEHOLDER_REPORTS: Report[] = [
  { id: '1', patientName: 'Priya Sharma', date: '10/04/2025', status: 'Normal' },
  { id: '2', patientName: 'Anjali Patel', date: '09/04/2025', status: 'Pending Review' },
  { id: '3', patientName: 'Meera Singh', date: '08/04/2025', status: 'Abnormal' },
  { id: '4', patientName: 'Neha Verma', date: '05/04/2025', status: 'Normal' },
  { id: '5', patientName: 'Sunita Das', date: '01/04/2025', status: 'Normal' },
];

export default function ReportsScreen() {
  const renderReportItem = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportItem}
    >
      <View style={styles.reportContent}>
        <ThemedText style={styles.patientName}>{item.patientName}</ThemedText>
        <ThemedText style={styles.reportDate}>{item.date}</ThemedText>
      </View>
      <View style={[
        styles.statusBadge,
        { 
          backgroundColor: 
            item.status === 'Normal' 
              ? 'rgba(46, 204, 113, 0.2)' 
              : item.status === 'Abnormal' 
                ? 'rgba(231, 76, 60, 0.2)' 
                : 'rgba(246, 187, 66, 0.2)' 
        }
      ]}>
        <ThemedText
          style={[
            styles.reportStatus,
            { 
              color: 
                item.status === 'Normal' 
                  ? '#2ecc71' 
                  : item.status === 'Abnormal' 
                    ? '#e74c3c' 
                    : '#f6bb42' 
            }
          ]}
        >
          {item.status}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Reports</ThemedText>
        <TouchableOpacity>
          <MaterialIcons name="filter-list" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={PLACEHOLDER_REPORTS}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  listContainer: {
    padding: 16,
  },
  reportItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
  reportContent: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reportStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
});
