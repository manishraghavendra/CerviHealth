import { Stack } from 'expo-router';
import React from 'react';
import DoctorAppointmentRequestScreen from '../src/screens/DoctorAppointmentRequestScreen';

export default function DoctorAppointmentRequest() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DoctorAppointmentRequestScreen />
    </>
  );
} 