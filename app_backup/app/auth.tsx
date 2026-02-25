import { Stack } from 'expo-router';
import React from 'react';
import LoginRegisterScreen from '../src/screens/LoginRegisterScreen';

export default function Auth() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LoginRegisterScreen />
    </>
  );
} 