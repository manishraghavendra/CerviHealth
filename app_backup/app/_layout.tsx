import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { auth } from '../src/services/firebaseConfig';
import { getUserData } from '../src/services/firestore';

// Define user data type
interface UserData {
  role?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: any;
}

// Define the Layout component
export default function RootLayoutComponent() {
  const [authInitialized, setAuthInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Set up authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get user data to determine role
          const userData = await getUserData(firebaseUser.uid) as UserData | null;
          setUserRole(userData?.role || null);
        } catch (error) {
          console.error('Error getting user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      
      setAuthInitialized(true);
    });

    return unsubscribe;
  }, []);
  
  // Handle routing based on authentication state
  useEffect(() => {
    if (!authInitialized) return;

    // Check if the user is on the auth or index screen
    const inAuthGroup = segments[0] === undefined || segments[0] === 'auth';

    if (user && userRole) {
      // User is signed in, route to the appropriate home screen
      if (inAuthGroup) {
        switch (userRole) {
          case 'Patient':
            router.replace('/patient-home' as any);
            break;
          case 'Healthcare Worker':
            router.replace('/healthcare-worker-home' as any);
            break;
          case 'Doctor':
            router.replace('/doctor-home' as any);
            break;
          default:
            router.replace('/patient-home' as any);
        }
      }
    } else if (!user) {
      // User is not signed in, route to auth screen
      // Allow navigation to index (splash screen)
      if (segments[0] !== undefined && segments[0] !== 'auth') {
        router.replace('/auth' as any);
      }
    }
  }, [user, userRole, authInitialized, segments, router]);

  if (!loaded || !authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="patient-home" />
        <Stack.Screen name="healthcare-worker-home" />
        <Stack.Screen name="doctor-home" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not Found' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
