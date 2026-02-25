import { Stack } from 'expo-router';
import React from 'react';
import DoctorHomeScreen from '../src/screens/DoctorHomeScreen';

export default function DoctorHome() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DoctorHomeScreen />
    </>
  );
} 