import { Stack } from 'expo-router';
import React from 'react';
import DoctorReviewedReportsScreen from '../src/screens/DoctorReviewedReportsScreen';

export default function DoctorReviewedReportsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Reviewed Reports' }} />
      <DoctorReviewedReportsScreen />
    </>
  );
} 