import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { signOut } from '../services/auth';
import { auth } from '../services/firebaseConfig';
import { getPatientAppointments, getPatientDocIdByAuthUid, getPatientScreenings, getPatientWithDefaults, getUserData, getUserNotifications } from '../services/firestore';
// import { Appointment, Report } from '../types'; // Report type will be defined locally

// Define types for our data structures
interface UserData {
  name: string;
  email: string;
  role: string;
  patientId?: string; // This is the custom PT-YYYY... ID for display
  [key: string]: any;
}

// Updated Report type for more detailed downloads
interface ReportForDownload {
  id: string;
  date: string;
  status: string; // This is reviewStatus
  patientName?: string;
  patientId?: string; // This is displayPatientId
  imageUrl?: string;
  adjustedImageUrl?: string;
  doctorComments?: string;
  doctorName?: string; // Placeholder
  clinicName?: string; // Placeholder
  healthcareWorkerName?: string; // Placeholder
  // Add medical information
  patientAge?: number;
  bloodGroup?: string;
  menstrualStatus?: string;
  symptoms?: string[];
  medicalHistory?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
}

const { width } = Dimensions.get('window');

export default function PatientHomeScreen() {
  const [userName, setUserName] = useState('Patient');
  const [displayPatientId, setDisplayPatientId] = useState(''); // For the custom PT-YYYY... ID
  const [reports, setReports] = useState<ReportForDownload[]>([]); // Use new Report type
  const [nextAppointment, setNextAppointment] = useState<any | null>(null); // Assuming Appointment type from ../types
  const [lastScreeningDate, setLastScreeningDate] = useState('No screenings yet');
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const authUid = auth.currentUser?.uid;
        let currentUserName = 'Patient';
        let currentDisplayPatientId = '';

        if (authUid) {
          const userData = await getUserData(authUid) as UserData;
          if (userData) {
            currentUserName = userData.name || 'Patient';
            currentDisplayPatientId = userData.patientId || '';
            setUserName(currentUserName);
            setDisplayPatientId(currentDisplayPatientId);
          }

          const patientDocumentId = await getPatientDocIdByAuthUid(authUid);

          if (patientDocumentId) {
            const screenings = await getPatientScreenings(patientDocumentId);
            if (screenings && screenings.length > 0) {
              // Get patient medical details
              const patientMedicalData = await getPatientWithDefaults(patientDocumentId);
              const typedPatientData = patientMedicalData as any;
              
              const reportData = screenings.map(screening => ({
                id: screening.id || '',
                date: screening.createdAt
                  ? new Date(screening.createdAt.seconds * 1000).toLocaleDateString()
                  : 'Unknown date',
                status: screening.reviewStatus || 'Pending',
                imageUrl: screening.imageUrl,
                adjustedImageUrl: screening.adjustedImageUrl,
                doctorComments: screening.doctorComments,
                // Populate with current user's data and placeholders
                patientName: currentUserName,
                patientId: currentDisplayPatientId,
                doctorName: 'Dr. A. Placeholder', // Dummy doctor name
                clinicName: 'CerviHealth Digital Clinic', // Dummy clinic name
                healthcareWorkerName: 'Screening Unit Staff', // Dummy HCW name
                // Add medical information
                patientAge: typedPatientData?.age,
                bloodGroup: typedPatientData?.bloodGroup,
                menstrualStatus: typedPatientData?.menstrualStatus,
                symptoms: typedPatientData?.symptoms,
                medicalHistory: typedPatientData?.medicalHistory,
              }));
              setReports(reportData as ReportForDownload[]);

              if (screenings[0].createdAt) {
                const date = new Date(screenings[0].createdAt.seconds * 1000);
                setLastScreeningDate(date.toLocaleDateString());
              }
            }

            const appointments = await getPatientAppointments(patientDocumentId);
            if (appointments && appointments.length > 0) {
              const acceptedAppointments = appointments.filter(
                app => app.status === 'Accepted' && new Date(app.requestedDate.seconds * 1000) > new Date()
              );

              if (acceptedAppointments.length > 0) {
                acceptedAppointments.sort((a, b) =>
                  a.requestedDate.seconds - b.requestedDate.seconds
                );
                setNextAppointment(acceptedAppointments[0]);
              }
            }
          } else {
            console.warn("Patient document ID not found for current user. Screenings and appointments might not load.");
            setReports([]);
            setNextAppointment(null);
            setLastScreeningDate('Patient record not found');
          }

          const notifications = await getUserNotifications(authUid);
          const unreadCount = notifications.filter(notification => !notification.read).length;
          setNotificationCount(unreadCount);
        }
      } catch (error) {
        console.error('Error fetching data for Patient Home Screen:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/auth-screen');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDownloadReport = async (report: ReportForDownload) => {
    const reportContent = `
==================================================
          CERVICAL SCREENING REPORT
==================================================

Patient Name: ${report.patientName || 'N/A'}
Patient ID: ${report.patientId || 'N/A'}
Report ID: ${report.id}
Date of Report: ${report.date}
Clinic: ${report.clinicName || 'CerviHealth Digital Clinic'}

--------------------------------------------------
              PATIENT INFORMATION
--------------------------------------------------

Age: ${report.patientAge || 'Not specified'}
Blood Group: ${report.bloodGroup || 'Not specified'}
Menstrual Status: ${report.menstrualStatus || 'Not specified'}

Reported Symptoms:
${report.symptoms && report.symptoms.length > 0 
  ? report.symptoms.map(symptom => `• ${symptom}`).join('\n')
  : '• No symptoms reported'
}

Medical History:
${report.medicalHistory || 'No medical history provided'}

--------------------------------------------------
              SCREENING DETAILS
--------------------------------------------------

Status: ${report.status || 'Pending'}

--------------------------------------------------
              IMAGING
--------------------------------------------------

Screening Image Link: ${report.adjustedImageUrl || report.imageUrl || 'No image available'}
(If a link is provided above, please copy and paste it into your browser to view the image.)

==================================================
          CONFIDENTIAL MEDICAL REPORT
==================================================
This report is for informational purposes only. Please consult with your healthcare provider for any medical advice or treatment.
This is a digitally generated report from CerviHealth.
`;

    try {
      const filename = `CerviHealth_Report_${report.id}_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, reportContent);
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(fileUri);
      } else {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Save Screening Report'
        });
      }
      
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    }
  };

  const renderStatCard = ({ title, value, icon, color }: StatCardProps) => (
    <View style={styles.statCard}>
      <View style={styles.statCardIconContainer}>
        <MaterialIcons name={icon} size={24} color={color || Colors.primary} />
      </View>
      <View style={styles.statCardContent}>
        <ThemedText style={styles.statTitle}>{title}</ThemedText>
        <ThemedText style={[styles.statValue, color && { color }]}>{value}</ThemedText>
      </View>
    </View>
  );

  const renderReportItem = ({ item }: { item: ReportForDownload }) => (
    <TouchableOpacity
      style={styles.reportItem}
      onPress={() => router.push({
        pathname: '/doctor-report-view' as any,
        params: { screeningId: item.id }
      })}
    >
      <View style={styles.reportDetails}>
        <ThemedText style={styles.reportDate}>{item.date}</ThemedText>
        {item.patientAge && (
          <ThemedText style={styles.reportInfo}>Age: {item.patientAge}</ThemedText>
        )}
        {item.symptoms && item.symptoms.length > 0 && (
          <ThemedText style={styles.reportInfo} numberOfLines={1}>
            Symptoms: {item.symptoms.join(', ')}
          </ThemedText>
        )}
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'Normal' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)' }
        ]}>
          <ThemedText
            style={[
              styles.reportStatus,
              { color: item.status === 'Normal' ? '#2ecc71' : '#e74c3c' },
            ]}
          >
            {item.status}
          </ThemedText>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDownloadReport(item)} style={styles.downloadButton}>
        <MaterialIcons name="file-download" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const formatNextAppointment = () => {
    if (!nextAppointment) return 'None scheduled';
    
    const date = new Date(nextAppointment.requestedDate.seconds * 1000);
    return date.toLocaleDateString();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText numberOfLines={1} ellipsizeMode="tail" style={[styles.welcomeText, { color: '#000000' }]}>Welcome, {userName}</ThemedText>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/notifications' as any)}
            >
              <MaterialIcons name="notifications" size={24} color={Colors.textPrimary} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="power-settings-new" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        {displayPatientId && (
          <ThemedText style={styles.patientIdText}>ID: {displayPatientId}</ThemedText>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.reportsSection}>
          <ThemedText style={styles.sectionTitle}>Recent Reports</ThemedText>
          {reports.length > 0 ? (
            <FlatList
              data={reports}
              renderItem={renderReportItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <ThemedText style={styles.emptyMessage}>No screening reports available yet.</ThemedText>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#3498db' }]}
            onPress={() => router.push('/appointment-request')}
          >
            <MaterialIcons name="event" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Schedule Screening</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#9b59b6' }]}
            onPress={() => router.push('/doctor-appointment-request' as any)}
          >
            <MaterialIcons name="medical-services" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Doctor Appointment</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#9b59b6' }]}
            onPress={() => router.push('/patient-reports' as any)}
          >
            <MaterialIcons name="description" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>View Reports</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewAllAppointmentsButton}
            onPress={() => router.push('/patient-appointments' as any)}
          >
            <ThemedText style={styles.viewAllAppointmentsText}>View All Doctor & Screening Appointments</ThemedText>
            <MaterialIcons name="arrow-forward" size={16} color="#fff" />
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
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    maxWidth: '70%',
    color: '#000000',
  },
  patientIdText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'black',
  },
  reportsSection: {
    marginBottom: 24,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  reportDetails: {
    flex: 1,
  },
  reportDate: {
    fontSize: 16,
    marginBottom: 4,
  },
  reportInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyMessage: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  viewAllAppointmentsButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  viewAllAppointmentsText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  statCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
