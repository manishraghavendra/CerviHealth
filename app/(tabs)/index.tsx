import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { auth } from '../../src/services/firebaseConfig';
import { getUserData } from '../../src/services/firestore';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }
        
        const userData = await getUserData(user.uid);
        if (userData) {
          setUserRole((userData as any).role);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking user role:', error);
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!auth.currentUser) {
    return <Redirect href="/auth-screen" />;
  }

  if (userRole === 'patient') {
    return <Redirect href="/patient-home" />;
  } else if (userRole === 'doctor') {
    return <Redirect href="/doctor-home" />;
  } else if (userRole === 'healthcare-worker') {
    return <Redirect href="/healthcare-worker-home" />;
  }

  // Default fallback
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Unknown user role. Please contact support.</Text>
    </View>
  );
}
