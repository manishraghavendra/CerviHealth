import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { getAllPatientIds, updatePatient } from '../services/firestore';

// Blood Group Options
const BLOOD_GROUP_OPTIONS = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
];

// Menstrual Status Options
const MENSTRUAL_STATUS_OPTIONS = [
  { label: 'Pre-Menopausal', value: 'Pre-Menopausal' },
  { label: 'Post-Menopausal', value: 'Post-Menopausal' },
];

// Symptoms Options
const SYMPTOMS_OPTIONS = [
  { id: 'lower_abdominal_pain', label: 'Lower Abdominal Pain' },
  { id: 'intermenstrual_bleeding', label: 'Intermenstrual Bleeding' },
  { id: 'post_coital_bleeding', label: 'Post-Coital Bleeding' },
  { id: 'heavy_periods', label: 'Heavy Periods' },
  { id: 'painful_periods', label: 'Painful Periods' },
  { id: 'vaginal_discharge', label: 'Abnormal Vaginal Discharge' },
  { id: 'pelvic_pain', label: 'Pelvic Pain' },
  { id: 'none', label: 'None' },
];

export default function NewPatientDetailsScreen() {
  const [age, setAge] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Patient selection dropdown
  const [patientSelectOpen, setPatientSelectOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientOptions, setPatientOptions] = useState<{label: string, value: string}[]>([]);
  
  // Dropdown states
  const [bloodGroupOpen, setBloodGroupOpen] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('');
  const [bloodGroupItems, setBloodGroupItems] = useState(BLOOD_GROUP_OPTIONS);
  
  const [menstrualStatusOpen, setMenstrualStatusOpen] = useState(false);
  const [menstrualStatus, setMenstrualStatus] = useState('');
  const [menstrualStatusItems, setMenstrualStatusItems] = useState(MENSTRUAL_STATUS_OPTIONS);
  
  // Symptoms state
  const [symptoms, setSymptoms] = useState<{ [key: string]: boolean }>({});
  
  // Fetch patient options on component mount
  useEffect(() => {
    const fetchPatientOptions = async () => {
      try {
        const options = await getAllPatientIds();
        setPatientOptions(options);
      } catch (error) {
        console.error('Error fetching patient options:', error);
        setError('Failed to load patient list');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchPatientOptions();
  }, []);
  
  // Initialize symptoms
  useEffect(() => {
    const initialSymptoms: { [key: string]: boolean } = {};
    SYMPTOMS_OPTIONS.forEach(symptom => {
      initialSymptoms[symptom.id] = false;
    });
    setSymptoms(initialSymptoms);
  }, []);
  
  const toggleSymptom = (id: string) => {
    // If "None" is selected, unselect all others
    if (id === 'none') {
      const updatedSymptoms: { [key: string]: boolean } = {};
      SYMPTOMS_OPTIONS.forEach(symptom => {
        updatedSymptoms[symptom.id] = symptom.id === 'none' ? !symptoms['none'] : false;
      });
      setSymptoms(updatedSymptoms);
    } else {
      // If any other symptom is selected, unselect "None"
      setSymptoms({
        ...symptoms,
        [id]: !symptoms[id],
        none: false
      });
    }
  };

  const handleSubmit = async () => {
    // Reset any previous errors
    setError('');

    // Validate required fields
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    if (!age.trim() || isNaN(parseInt(age))) {
      setError('Please enter a valid age');
      return;
    }

    setIsLoading(true);

    try {
      // Get selected symptoms
      const selectedSymptoms = Object.keys(symptoms)
        .filter(key => symptoms[key])
        .map(key => SYMPTOMS_OPTIONS.find(s => s.id === key)?.label || key);

      // Prepare medical details to update
      const medicalData = {
        age: parseInt(age),
        bloodGroup: bloodGroup || "",
        menstrualStatus: menstrualStatus || "",
        symptoms: selectedSymptoms,
        medicalHistory: medicalHistory?.trim() || ""
      };

      // Update existing patient with medical details
      await updatePatient(selectedPatient, medicalData);

      // Navigate to image capture with the patient ID
      router.push({ 
        pathname: "/image-capture", 
        params: { patientId: selectedPatient } 
      });

    } catch (err) {
      console.error('Error updating patient:', err);
      setError('Failed to update patient information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add Patient</ThemedText>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <ThemedText style={styles.loadingText}>Loading patient list...</ThemedText>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Select Patient</ThemedText>
                <View style={styles.dropdownWrapper}>
                  <DropDownPicker
                    open={patientSelectOpen}
                    value={selectedPatient}
                    items={patientOptions}
                    setOpen={setPatientSelectOpen}
                    setValue={setSelectedPatient}
                    setItems={setPatientOptions}
                    placeholder="Select Patient for Screening"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    listMode="MODAL"
                    searchable={true}
                    searchPlaceholder="Search by name or ID"
                    modalProps={{
                      animationType: "slide"
                    }}
                    modalContentContainerStyle={styles.modalContent}
                  />
                </View>
                {selectedPatient && (
                  <ThemedText style={styles.noteText}>
                    Patient selected. Please fill in the medical details below.
                  </ThemedText>
                )}
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Patient Age</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter patient's current age"
                  placeholderTextColor="#9e9e9e"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Blood Group</ThemedText>
                <DropDownPicker
                  open={bloodGroupOpen}
                  value={bloodGroup}
                  items={bloodGroupItems}
                  setOpen={setBloodGroupOpen}
                  setValue={setBloodGroup}
                  setItems={setBloodGroupItems}
                  placeholder="Select blood group"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  listMode="MODAL"
                  modalProps={{
                    animationType: "slide"
                  }}
                  modalContentContainerStyle={styles.modalContent}
                  zIndex={3000}
                />
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Menstrual Status</ThemedText>
                <DropDownPicker
                  open={menstrualStatusOpen}
                  value={menstrualStatus}
                  items={menstrualStatusItems}
                  setOpen={setMenstrualStatusOpen}
                  setValue={setMenstrualStatus}
                  setItems={setMenstrualStatusItems}
                  placeholder="Select menstrual status"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  listMode="MODAL"
                  modalProps={{
                    animationType: "slide"
                  }}
                  modalContentContainerStyle={styles.modalContent}
                  zIndex={2000}
                />
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Current Symptoms</ThemedText>
                <View style={styles.symptomsContainer}>
                  {SYMPTOMS_OPTIONS.map((symptom) => (
                    <TouchableOpacity
                      key={symptom.id}
                      style={styles.checkboxContainer}
                      onPress={() => toggleSymptom(symptom.id)}
                    >
                      <View style={[
                        styles.checkbox,
                        symptoms[symptom.id] && styles.checkboxChecked
                      ]}>
                        {symptoms[symptom.id] && (
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <ThemedText style={[styles.checkboxLabel, { color: '#000000' }]}>{symptom.label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Medical History</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter relevant medical history for screening"
                  placeholderTextColor="#9e9e9e"
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>
                      Update & Proceed to Capture
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  dropdownWrapper: {
    zIndex: 9999,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#212121',
  },
  textArea: {
    minHeight: 100,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '50%',
    marginBottom: 15,
    paddingRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3498db',
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkboxLabel: {
    fontSize: 14,
    flexShrink: 1,
    flex: 1,
    lineHeight: 20,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noteText: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fdecea',
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});
