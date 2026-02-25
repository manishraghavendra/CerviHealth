import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth-screen" />
      <Stack.Screen name="patient-home" />
      <Stack.Screen name="healthcare-worker-home" />
      <Stack.Screen name="doctor-home" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      <Stack.Screen name="patient-reports" />
      <Stack.Screen name="doctor-appointments" />
      <Stack.Screen name="doctor-appointment-request" />
    </Stack>
  );
}