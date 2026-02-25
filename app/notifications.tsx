import { Stack } from 'expo-router';
import React from 'react';
import NotificationsScreen from '../src/screens/NotificationsScreen';

export default function Notifications() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NotificationsScreen />
    </>
  );
} 