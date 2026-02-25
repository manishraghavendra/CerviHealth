import { Stack } from 'expo-router';
import React from 'react';
import HealthcareWorkerHomeScreen from '../src/screens/HealthcareWorkerHomeScreen';

export default function HealthcareWorkerHome() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HealthcareWorkerHomeScreen />
    </>
  );
} 