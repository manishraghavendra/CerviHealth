import { Stack } from 'expo-router';
import React from 'react';
import AllAppointmentsScreen from '../src/screens/AllAppointmentsScreen';

export default function AllAppointments() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AllAppointmentsScreen />
    </>
  );
} 