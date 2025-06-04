import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Create the context
export const AuthContext = createContext();

// Storage key
const USER_SESSION_KEY = 'userSession';

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved session on component mount
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const storedUserSession = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (storedUserSession) {
          setUser(JSON.parse(storedUserSession));
        }
      } catch (e) {
        console.error('Failed to load user session from storage', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserSession();
  }, []);

  // Login function
  const login = async (userData) => {
    try {
      const sessionData = { ...userData };
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionData));
      setUser(sessionData);
    } catch (e) {
      console.error('Failed to save user session to storage', e);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      setUser(null);
    } catch (e) {
      console.error('Failed to remove user session from storage', e);
    }
  };

  // --- Function to update user location in context and storage ---
  const updateUserLocation = async (locationData) => {
    if (!user) return;
    const updatedUser = { ...user, location: locationData };
    try {
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (e) {
      console.error('Failed to update user location in storage', e);
    }
  };

  // --- Generic Function to update user context and storage ---
  const updateUserContext = async (updates) => {
    if (!user) return; // Should not happen if called after login

    // Merge existing user data with the updates
    const updatedUser = { ...user, ...updates };

    try {
      // Save the updated user object to AsyncStorage
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
      // Update the context state
      setUser(updatedUser);
      console.log('User context updated:', updatedUser); // Log for debugging
    } catch (e) {
      console.error('Failed to update user context in storage', e);
      // Handle error - maybe alert the user?
      throw e; // Re-throw error so ProfileScreen can catch it
    }
  };
  // --- End update user context function ---

  // Show loading indicator while checking session
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  // Provide the auth state and functions (including updateUserContext)
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUserLocation, updateUserContext }}>
      {children}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
});

