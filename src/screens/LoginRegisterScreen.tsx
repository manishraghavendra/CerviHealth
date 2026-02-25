import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { TabBar, TabView } from 'react-native-tab-view';
import { Colors } from '../../constants/Colors';
import { registerUser, sendOTP, signIn, verifyOTP } from '../services/auth';
import { getUserData, saveUserData } from '../services/firestore';

const LoginRegisterScreen = () => {
  const router = useRouter();

  // Tab navigation state
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'login', title: 'Login' },
    { key: 'register', title: 'Register' },
  ]);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [showRoleOptions, setShowRoleOptions] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerConfirmation, setRegisterConfirmation] = useState<any>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [userId, setUserId] = useState(null);

  const handleSignIn = async () => {
    // Validate input
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sign in with email and password
      const user = await signIn(email, password) as any;
      
      // Get user data to get phone number
      const userData = await getUserData(user.uid) as any;
      
      if (userData && userData.phoneNumber) {
        // Send OTP to the user's phone number
        const confirmationResult = await sendOTP(userData.phoneNumber);
        setConfirmation(confirmationResult);
        setOtpSent(true);
        setError('');
      } else {
        setError('Phone number not found for this account');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify OTP
      await verifyOTP(confirmation, otp);
      
      // Get user data to get role
      const user = await getUserData(confirmation.user.uid);
      
      // Navigate based on user role
      if (user && (user as any).role) {
        navigateByRole((user as any).role);
      } else {
        // Default to patient home if role is not found
        router.replace('/patient-home');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSendRegisterOTP = async () => {
    // Validate inputs
    if (!validateRegisterInputs()) {
      return;
    }

    setRegisterLoading(true);
    setRegisterError('');

    try {
      // Register user with email and password
      const user = await registerUser(registerEmail, registerPassword) as any;
      setUserId(user.uid);

      // Send OTP to the provided phone number
      const confirmationResult = await sendOTP(registerPhone);
      setRegisterConfirmation(confirmationResult as any);
      setRegisterOtpSent(true);
    } catch (error) {
      console.error('Registration error:', error);
      setRegisterError(getErrorMessage(error));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifyRegisterOTP = async () => {
    if (!registerOtp) {
      setRegisterError('Please enter the OTP');
      return;
    }

    setRegisterLoading(true);
    setRegisterError('');

    try {
      // Verify OTP
      await verifyOTP(registerConfirmation, registerOtp);
      setOtpVerified(true);
    } catch (error) {
      console.error('OTP verification error:', error);
      setRegisterError(getErrorMessage(error));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!userId) {
      throw new Error('User ID is missing');
    }
    setRegisterLoading(true);
    setRegisterError('');

    try {
      // Save user data to Firestore
      await saveUserData(
        userId,
        fullName,
        registerEmail,
        registerPhone,
        typeof role === 'string' ? role : ''
      );

      // Navigate based on role
      navigateByRole(role);
    } catch (error) {
      console.error('Error saving user data:', error);
      setRegisterError(getErrorMessage(error));
    } finally {
      setRegisterLoading(false);
    }
  };

  const validateRegisterInputs = () => {
    // Check if all fields are filled
    if (!fullName || !role || !registerEmail || !registerPassword || !confirmPassword || !registerPhone) {
      setRegisterError('Please fill in all fields');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      setRegisterError('Please enter a valid email address');
      return false;
    }

    // Validate password length
    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters long');
      return false;
    }

    // Check if passwords match
    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match');
      return false;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(registerPhone)) {
      setRegisterError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const navigateByRole = (role: any) => {
    switch (role) {
      case 'Patient':
        router.replace('/patient-home');
        break;
      case 'Healthcare Worker':
        router.replace('/healthcare-worker-home');
        break;
      case 'Doctor':
        router.replace('/doctor-home');
        break;
      default:
        router.replace('/patient-home');
    }
  };

  const getErrorMessage = (error: any) => {
    // Extract meaningful error message from Firebase error
    const errorCode = error.code || '';
    
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'User not found. Please check your email or register.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      case 'auth/invalid-verification-code':
        return 'Invalid OTP. Please check and try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please use a different email or login.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  };

  const handleForgotPassword = () => {
    // Functionality will be added in later phase
    Alert.alert('Forgot Password', 'Password recovery functionality will be available soon.');
  };

  const renderLoginTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <View style={styles.formSection}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading && !otpSent}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            secureTextEntry
            editable={!loading && !otpSent}
          />
          
          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.forgotPassword}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
          
          {!otpSent ? (
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.otpMessage}>
                Enter the OTP sent to your registered phone number
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor={Colors.textSecondary}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text);
                  setError('');
                }}
                keyboardType="number-pad"
                editable={!loading}
              />
              
              <TouchableOpacity 
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderRegisterTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={Colors.textSecondary}
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setRegisterError('');
          }}
          editable={!registerLoading}
        />
        
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowRoleOptions(!showRoleOptions)}
            disabled={registerLoading || registerOtpSent}
          >
            <Text style={styles.dropdownText}>
              {role ? role : 'Select Role'}
            </Text>
            <MaterialIcons 
              name={showRoleOptions ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color={Colors.textPrimary} 
            />
          </TouchableOpacity>
          
          {showRoleOptions && (
            <View style={styles.roleOptions}>
              {['Patient', 'Healthcare Worker', 'Doctor'].map((roleOption, index) => (
                <TouchableOpacity
                  key={roleOption}
                  style={[
                    styles.roleOption,
                    role === roleOption && styles.selectedRoleOption,
                    index === 2 && styles.lastRoleOption
                  ]}
                  onPress={() => {
                    setRole(roleOption);
                    setShowRoleOptions(false);
                    setRegisterError('');
                  }}
                >
                  <Text style={[
                    styles.roleOptionText,
                    role === roleOption && styles.selectedRoleOptionText
                  ]}>
                    {roleOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={registerEmail}
          onChangeText={(text) => {
            setRegisterEmail(text);
            setRegisterError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!registerLoading && !registerOtpSent}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={registerPassword}
          onChangeText={(text) => {
            setRegisterPassword(text);
            setRegisterError('');
          }}
          secureTextEntry
          editable={!registerLoading && !registerOtpSent}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={Colors.textSecondary}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setRegisterError('');
          }}
          secureTextEntry
          editable={!registerLoading && !registerOtpSent}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor={Colors.textSecondary}
          value={registerPhone}
          onChangeText={(text) => {
            setRegisterPhone(text);
            setRegisterError('');
          }}
          keyboardType="phone-pad"
          editable={!registerLoading && !registerOtpSent}
        />
        
        <TouchableOpacity 
          style={[styles.button, registerLoading && styles.disabledButton]}
          onPress={handleSendRegisterOTP}
          disabled={registerLoading || registerOtpSent}
        >
          {registerLoading && !registerOtpSent ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
        </TouchableOpacity>
        
        {registerOtpSent && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor={Colors.textSecondary}
              value={registerOtp}
              onChangeText={(text) => {
                setRegisterOtp(text);
                setRegisterError('');
              }}
              keyboardType="number-pad"
              editable={!registerLoading}
            />
            
            <TouchableOpacity 
              style={[styles.button, registerLoading && styles.disabledButton]}
              onPress={handleVerifyRegisterOTP}
              disabled={registerLoading || otpVerified}
            >
              {registerLoading && !otpVerified ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        
        {otpVerified && (
          <TouchableOpacity 
            style={[styles.button, registerLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={registerLoading}
          >
            {registerLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const renderScene = ({ route }: any) => {
    switch (route.key) {
      case 'login':
        return renderLoginTab();
      case 'register':
        return renderRegisterTab();
      default:
        return null;
    }
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: Colors.primary }}
      style={{ backgroundColor: Colors.background }}
      labelStyle={{ fontWeight: 'bold' }}
      activeColor={Colors.primary}
      inactiveColor={Colors.textSecondary}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>CerviHealth</Text>
        </View>
        
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          renderTabBar={renderTabBar}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  tabContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    padding: 10,
    fontSize: 16,
    borderColor: '#E0E0E0',
    color: Colors.textPrimary,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  forgotPassword: {
    textAlign: 'right',
    marginBottom: 15,
    fontSize: 14,
    color: Colors.primary,
  },
  otpMessage: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 15,
    textAlign: 'center',
  },
  dropdownContainer: {
    position: 'relative',
    marginBottom: 15,
    zIndex: 1000,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    borderColor: '#E0E0E0',
    color: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  roleOptions: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 8,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedRoleOption: {
    backgroundColor: 'rgba(103, 58, 183, 0.1)',
  },
  roleOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  selectedRoleOptionText: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  lastRoleOption: {
    borderBottomWidth: 0,
  },
});

export default LoginRegisterScreen;
