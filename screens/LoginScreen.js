import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDatabase,
  ref,
  get,
} from 'firebase/database';
import { app } from '../firebaseConfig';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; // Added icons

const sanitizeEmailForKey = (email) => {
  return email.replace(/[.#$[\/]/g, ',');
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const database = getDatabase(app);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o email e a senha.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        Alert.alert('Email Inválido', 'Por favor, insira um email válido.');
        return;
    }

    setLoading(true);
    const sanitizedEmailKey = sanitizeEmailForKey(email.toLowerCase());
    const userRef = ref(database, `users/${sanitizedEmailKey}`);

    try {
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        // Compare plain text password directly (INSECURE!)
        const isPasswordMatch = password === userData.password;

        if (isPasswordMatch) {
          const userSessionData = {
            userId: userData.userId,
            email: userData.email,
            fullName: userData.fullName,
          };
          await login(userSessionData);
        } else {
          Alert.alert('Erro de Login', 'Email ou senha inválidos.');
          setLoading(false);
        }
      } else {
        Alert.alert('Erro de Login', 'Email ou senha inválidos.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('Erro de Login', 'Ocorreu um erro ao fazer login. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.logoPlaceholder}>
            {/* Replace with actual logo if available */}
            <Ionicons name="beer-outline" size={50} color="#6200EE" />
            <Text style={styles.logoText}>VibeCheck</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.duration(500).delay(200)} style={styles.title}>Bem-vindo de volta!</Animated.Text>
        <Animated.Text entering={FadeInDown.duration(500).delay(300)} style={styles.subtitle}>Faça login para checar a vibe</Animated.Text>

        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Seu Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#aaa"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Sua Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#aaa"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.linkWrapper}>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.linkText}>Não tem conta? <Text style={styles.linkTextBold}>Cadastre-se aqui!</Text></Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Updated Styles with Poppins font and refinements
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  logoPlaceholder: {
      alignItems: 'center',
      marginBottom: 30,
  },
  logoText: {
      fontFamily: 'Poppins-Bold', // Apply custom font
      fontSize: 24,
      marginTop: 10,
      color: '#6200EE',
  },
  title: {
    fontFamily: 'Poppins-Bold', // Apply custom font
    fontSize: 26,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular', // Apply custom font
    fontSize: 16,
    color: '#667',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: 55,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#D1D9E6',
      borderRadius: 12,
      marginBottom: 18,
      paddingHorizontal: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
  },
  inputIcon: {
      marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular', // Apply custom font
    fontSize: 16,
    color: '#333',
    height: '100%', // Ensure TextInput fills wrapper height
  },
  buttonWrapper: {
      width: '100%',
      marginTop: 15,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#6200EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowColor: '#BDBDBD',
    elevation: 0,
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold', // Apply custom font
    color: '#ffffff',
    fontSize: 16,
  },
  linkWrapper: {
      marginTop: 30,
  },
  linkText: {
    fontFamily: 'Poppins-Regular', // Apply custom font
    color: '#555',
    fontSize: 14,
  },
  linkTextBold: {
      fontFamily: 'Poppins-SemiBold', // Apply custom font
      color: '#6200EE',
      // textDecorationLine: 'underline', // Optional: remove underline
  }
});
