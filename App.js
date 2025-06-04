import React, { useContext, useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native'; // Added Text
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Font from 'expo-font';

// Import Auth Context and Provider
import { AuthContext, AuthProvider } from './context/AuthContext';

// Import Main App Screens
import HomeScreen from './screens/HomeScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import AddReviewScreen from './screens/AddReviewScreen';
import ProfileScreen from './screens/ProfileScreen';
// Import Regional Chat Screen (replaces GeneralChatScreen)
import RegionalChatScreen from './screens/RegionalChatScreen';

// Import Auth Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

// Import Location Selection Screen
import LocationSelectionScreen from './screens/LocationSelectionScreen';

const MainStack = createStackNavigator();
const AuthStack = createStackNavigator();

// Function to load fonts
const loadFonts = async () => {
  await Font.loadAsync({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
  });
};

// --- Main Navigator (Handles location check) ---
function MainNavigator() {
  const { user } = useContext(AuthContext);
  const hasLocation = user?.location?.city && user?.location?.state;

  return (
    <MainStack.Navigator
      // Start at LocationSelection if location is not set, otherwise Home
      initialRouteName={hasLocation ? "Home" : "LocationSelection"}
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: '#333',
      }}
    >
      {/* Location Selection Screen (only shown if needed) */}
      <MainStack.Screen
        name="LocationSelection"
        component={LocationSelectionScreen}
        options={{ title: 'Selecione sua Região', headerLeft: null }} // No back button
      />
      {/* Regular Main Screens */}
      <MainStack.Screen
        name="Home"
        component={HomeScreen}
        // Options set dynamically in HomeScreen
      />
      <MainStack.Screen
        name="PlaceDetail"
        component={PlaceDetailScreen}
        options={{ title: 'Detalhes do Local' }}
      />
      <MainStack.Screen
        name="AddReview"
        component={AddReviewScreen}
        options={{ title: 'Avaliar Vibe' }}
      />
      <MainStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Meu Perfil' }}
      />
      {/* Regional Chat Screen */}
      <MainStack.Screen
        name="RegionalChat"
        component={RegionalChatScreen}
        // Title set dynamically in RegionalChatScreen based on route params
      />
    </MainStack.Navigator>
  );
}
// --- End Main Navigator ---

// Navigator for the authentication flow (when logged out)
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// Root component that decides which navigator to show based on AuthContext
function RootNavigator() {
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        await loadFonts();
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
      }
    }
    prepareApp();
  }, []);

  if (authLoading || !fontsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200EE" />
        {/* Added Text component for loading message */}
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // NavigationContainer should only wrap the navigator logic
  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// Main App component wraps everything with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  loadingText: { // Style for loading text
      marginTop: 10,
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
      color: '#667',
  },
  header: {
      backgroundColor: '#F0F4F8',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
  },
  headerTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: '#333',
  },
});
