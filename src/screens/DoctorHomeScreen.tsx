import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Progress from 'react-native-progress';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { signOut } from '../services/auth';
import { auth, firestore } from '../services/firebaseConfig';
import { getPendingScreenings, getUserData, getUserNotifications } from '../services/firestore';

// Define types for our data structures
interface UserData {
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface PendingReport {
  id: string;
  patientName: string;
  date: string;
  healthcareWorker?: string;
  createdAt?: any;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
}

interface CasesData {
  total: number;
  normal: number;
  abnormal: number;
}

interface MonthlyData {
  month: string;
  value: number;
}

const { width } = Dimensions.get('window');

export default function DoctorHomeScreen() {
  const [userName, setUserName] = useState('Doctor');
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [casesOverview, setCasesOverview] = useState<CasesData>({
    total: 0,
    normal: 0,
    abnormal: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userData = await getUserData(userId);
          if (userData) {
            setUserName((userData as any).name || 'Doctor');
          }
          const notifications = await getUserNotifications(userId);
          const unreadCount = notifications.filter(notification => !notification.read).length;
          setNotificationCount(unreadCount);
          
          // Fetch pending reports
          await fetchPendingReports();
          
          // Fetch statistics
          await fetchStatistics();
          
          // Fetch monthly data
          await fetchMonthlyData();
        }
      } catch (error) {
        console.error('Error fetching doctor data:', error);
      }
    };

    fetchDoctorData();
  }, []);
  
  const fetchPendingReports = async () => {
    try {
      const pendingScreenings = await getPendingScreenings();
      const formattedReports = pendingScreenings.map(screening => ({
        id: screening.id,
        patientName: screening.patientName || 'Unknown Patient',
        date: formatDate(screening.createdAt),
        healthcareWorker: screening.healthcareWorkerName || 'Unknown',
        createdAt: screening.createdAt
      }));
      
      setPendingReports(formattedReports);
      setPendingReviewsCount(formattedReports.length);
    } catch (error) {
      console.error('Error fetching pending reports:', error);
    }
  };
  
  const fetchStatistics = async () => {
    try {
      // Get all screenings
      const screeningsQuery = query(collection(firestore, 'screenings'));
      const querySnapshot = await getDocs(screeningsQuery);
      
      let total = 0;
      let normal = 0;
      let abnormal = 0;
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        total++;
        
        if (data.reviewStatus === 'Normal') {
          normal++;
        } else if (data.reviewStatus === 'Abnormal') {
          abnormal++;
        }
      });
      
      setCasesOverview({ total, normal, abnormal });
      setTotalReports(total);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };
  
  const fetchMonthlyData = async () => {
    try {
      // Get all screenings
      const screeningsQuery = query(collection(firestore, 'screenings'));
      const querySnapshot = await getDocs(screeningsQuery);
      
      // Initialize monthly counts
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyCounts: { [key: string]: number } = {};
      
      // Initialize all months with 0
      months.forEach(month => {
        monthlyCounts[month] = 0;
      });
      
      // Count screenings by month
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000);
          const month = months[date.getMonth()];
          monthlyCounts[month]++;
        }
      });
      
      // Convert to array format needed for chart
      let finalMonthlyData = months.map(month => ({
        month,
        value: monthlyCounts[month]
      }));

      const hasRealData = finalMonthlyData.some(item => item.value > 0);
      if (!hasRealData) {
        const dummyVersion = [...finalMonthlyData]; // Create a mutable copy
        const currentMonthIndex = new Date().getMonth();
        for (let i = 0; i < 6; i++) {
          const monthArrayIndexToUpdate = (currentMonthIndex - i + 12) % 12;
          dummyVersion[monthArrayIndexToUpdate] = {
            ...dummyVersion[monthArrayIndexToUpdate], // keep month name
            // Use slightly larger random values for better visibility if max height is 100
            value: Math.floor(Math.random() * 15) + 5 // Values between 5 and 20
          };
        }
        finalMonthlyData = dummyVersion; // Assign the modified copy back
      }
      
      setMonthlyData(finalMonthlyData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setLoading(false);
    }
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/auth-screen');
    } catch (error) {
      console.error('Error signing out:', error);
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

  const renderReportItem = ({ item }: { item: PendingReport }) => (
    <TouchableOpacity
      style={styles.reportItem}
      onPress={() => router.push({
        pathname: '/doctor-report-view' as any,
        params: { screeningId: item.id }
      })}
    >
      <View>
        <ThemedText style={styles.patientName}>{item.patientName}</ThemedText>
        <ThemedText style={styles.reportDate}>{item.date}</ThemedText>
        {item.healthcareWorker && (
          <ThemedText style={styles.healthcareWorker}>By {item.healthcareWorker}</ThemedText>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderMonthBar = ({ item, index }: { item: MonthlyData, index: number }) => {
    // Find max value for scaling
    const maxValue = Math.max(...monthlyData.map(d => d.value));
    // If all values are 0, set a default height
    const height = maxValue === 0 ? 20 : (item.value / maxValue) * 100;
    
    return (
      <View style={styles.monthBarContainer}>
        <View 
          style={[
            styles.monthBar, 
            { 
              height,
              backgroundColor: index % 2 === 0 ? '#3498db' : '#9b59b6'
            }
          ]} 
        />
        <ThemedText style={styles.monthLabel}>{item.month}</ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.welcomeText}>Welcome, {userName}</ThemedText>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/notifications' as any)}
            >
              <MaterialIcons name="notifications" size={24} color={Colors.textPrimary} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCountText}>
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
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>Dashboard</ThemedText>
          <View style={styles.statsContainer}>
            {renderStatCard({
              title: 'Total Reports',
              value: totalReports.toString(),
              icon: 'folder',
              color: Colors.textSecondary,
            })}
            {renderStatCard({
              title: 'Pending Reviews',
              value: pendingReviewsCount.toString(),
              icon: 'hourglass-empty',
              color: '#f6bb42',
            })}
            {renderStatCard({
              title: 'Abnormal Cases',
              value: casesOverview.abnormal.toString(),
              icon: 'warning',
              color: '#e74c3c',
            })}
          </View>
        </View>

        <View style={styles.casesSection}>
          <ThemedText style={styles.sectionTitle}>Cases Overview</ThemedText>
          <View style={styles.casesOverview}>
            <View style={styles.pieChartContainer}>
              <Progress.Circle
                size={120}
                thickness={10}
                progress={casesOverview.total > 0 ? casesOverview.abnormal / casesOverview.total : 0}
                color="#e74c3c"
                unfilledColor="#2ecc71"
                borderWidth={0}
                strokeCap="round"
              />
              <View style={styles.pieChartInner}>
                <ThemedText style={styles.abnormalPercentage}>
                  {casesOverview.total > 0 
                    ? Math.round((casesOverview.abnormal / casesOverview.total) * 100) 
                    : 0}%
                </ThemedText>
                <ThemedText style={styles.abnormalLabel}>Abnormal</ThemedText>
              </View>
            </View>
            <View style={styles.casesLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2ecc71' }]} />
                <ThemedText style={styles.legendText}>Normal: {casesOverview.normal}</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
                <ThemedText style={styles.legendText}>Abnormal: {casesOverview.abnormal}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.trendsSection}>
          <ThemedText style={styles.sectionTitle}>Monthly Trends</ThemedText>
          <View style={styles.barChartContainer}>
            <FlatList
              data={monthlyData}
              renderItem={renderMonthBar}
              keyExtractor={(item) => item.month}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.barChart}
            />
          </View>
        </View>

        <View style={styles.reportsSection}>
          <ThemedText style={styles.sectionTitle}>Pending Reports</ThemedText>
          {pendingReports.length > 0 ? (
            <FlatList
              data={pendingReports}
              renderItem={renderReportItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="check-circle" size={50} color="#e0e0e0" />
              <ThemedText style={styles.emptyText}>No pending reports to review</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#3498db' }]}
            onPress={() => router.push('/pending-screenings' as any)}
          >
            <MaterialIcons name="assignment" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Review Reports</ThemedText>
          </TouchableOpacity>
        </View>

        {/* New Button for All Reviewed Reports */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#27ae60' }]} // A green color for distinction
            onPress={() => router.push('/doctor-reviewed-reports' as any)} // Navigate to the new screen
          >
            <MaterialIcons name="history" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>View All Reviewed Reports</ThemedText>
          </TouchableOpacity>
        </View>

        {/* New Button for Doctor Appointments */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#9b59b6' }]} // Purple color for appointments
            onPress={() => router.push('/doctor-appointments' as any)} 
          >
            <MaterialIcons name="event" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Manage Appointments</ThemedText>
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
  notificationCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsContainer: {
    width: '100%',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statCardContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  casesSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  casesOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  pieChartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abnormalPercentage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  abnormalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  casesLegend: {
    flex: 1,
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  trendsSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  barChartContainer: {
    height: 150,
    marginVertical: 16,
  },
  barChart: {
    alignItems: 'flex-end',
    paddingVertical: 10,
    height: '100%',
  },
  monthBarContainer: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 6,
  },
  monthBar: {
    width: 16,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  reportsSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  reportItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  healthcareWorker: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 10,
  },
  buttonContainer: {
    marginBottom: 15, // Adjusted margin if buttons are stacked
  },
  button: {
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
