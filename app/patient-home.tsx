import { Stack } from 'expo-router';
import React from 'react';
import PatientHomeScreen from '../src/screens/PatientHomeScreen';

export default function PatientHome() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PatientHomeScreen />
    </>
  );
} 