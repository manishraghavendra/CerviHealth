import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { getUserData } from './firestore';

/**
 * Sign in user with email and password
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Promise<Object>} - The authenticated user object
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error in signIn:', error);
    throw error;
  }
};

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - The phone number to send OTP to (format: +91XXXXXXXXXX)
 * @returns {Promise<Object>} - The confirmation result to be used for verifying OTP
 */
export const sendOTP = async (phoneNumber) => {
  try {
    // First, ensure the phone number is in the correct format (E.164 standard)
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber}`;
    }

    console.log('Sending OTP to', phoneNumber);

    // Simulate OTP send for demo purposes
    // In a production app, you would use Firebase's phone auth
    return {
      confirm: async (code) => {
        // Simulate successful verification if code is "123456"
        if (code === "123456") {
          return { user: auth.currentUser };
        } else {
          throw new Error("Invalid verification code");
        }
      },
      user: auth.currentUser
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP
 * @param {Object} confirmation - The confirmation object returned from sendOTP
 * @param {string} otp - The OTP entered by the user
 * @returns {Promise<Object>} - The authenticated user object
 */
export const verifyOTP = async (confirmation, otp) => {
  try {
    const result = await confirmation.confirm(otp);
    return result.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Register a new user with email and password
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Promise<Object>} - The newly created user object
 */
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error in registerUser:', error);
    throw error;
  }
};

/**
 * Get user phone number for OTP login
 * @param {string} userId - The user's ID
 * @returns {Promise<string|null>} - The user's phone number or null if not found
 */
export const getUserPhoneNumber = async (userId) => {
  try {
    const userData = await getUserData(userId);
    return userData?.phoneNumber || null;
  } catch (error) {
    console.error('Error getting user phone number:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error('Error in signOut:', error);
    throw error;
  }
};

/**
 * Get the current user
 * @returns {Object|null} - The current user object or null if not signed in
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Set up auth state listener
 * @param {Function} callback - The callback function to be called when auth state changes
 * @returns {Function} - The listener function
 */
export const listenToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Send password reset email
 * @param {string} email - The user's email address
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Error in resetPassword:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} displayName - The user's display name
 * @param {string|null} photoURL - The user's photo URL or null
 * @returns {Promise<boolean>} - True if the profile was updated successfully, false otherwise
 */
export const updateUserProfile = async (displayName, photoURL = null) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL
      });
      return true;
    }
    throw new Error('No user is signed in');
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};
