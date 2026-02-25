import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// Import screens
import DoctorHomeScreen from '../screens/DoctorHomeScreen';
import HealthcareWorkerHomeScreen from '../screens/HealthcareWorkerHomeScreen';
import LoginRegisterScreen from '../screens/LoginRegisterScreen';
import PatientHomeScreen from '../screens/PatientHomeScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

/**
 * Note: This navigator is for reference and can be used for deeper navigation within screens.
 * The primary navigation is handled by Expo Router in the app directory.
 */
const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={LoginRegisterScreen} />
      <Stack.Screen name="PatientHome" component={PatientHomeScreen} />
      <Stack.Screen name="HealthcareWorkerHome" component={HealthcareWorkerHomeScreen} />
      <Stack.Screen name="DoctorHome" component={DoctorHomeScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
