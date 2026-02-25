import { Stack } from 'expo-router';
import React from 'react';
import DoctorAppointmentsScreen from '../src/screens/DoctorAppointmentsScreen';

export default function DoctorAppointments() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DoctorAppointmentsScreen />
    </>
  );
} 