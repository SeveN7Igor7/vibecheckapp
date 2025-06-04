import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getDatabase,
  ref,
  set,
  get,
} from 'firebase/database';
import { app } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons'; // Added icons

const sanitizeEmailForKey = (email) => {
  return email.replace(/[.#$[\/]/g, ',');
};

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const database = getDatabase(app);

  const handleSignup = async () => {
    // Validations remain the same
    if (!fullName || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Senhas Diferentes', 'As senhas digitadas não coincidem.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.');
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
        Alert.alert('Erro no Cadastro', 'Este email já está cadastrado.');
        setLoading(false);
        return;
      }

      // Save user info with plain text password (INSECURE!)
      await set(userRef, {
        userId: sanitizedEmailKey,
        fullName: fullName,
        phone: phone,
        email: email.toLowerCase(),
        password: password, // Store plain text password (INSECURE!)
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Cadastro Realizado!', 'Sua conta foi criada com sucesso. Faça o login.');
      navigation.navigate('Login');

    } catch (error) {
      console.error('Signup Error:', error);
      Alert.alert('Erro no Cadastro', 'Ocorreu um erro ao criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.innerContainer}>
          <Animated.Text entering={FadeInDown.duration(500).delay(100)} style={styles.title}>Crie sua Conta</Animated.Text>
          <Animated.Text entering={FadeInDown.duration(500).delay(200)} style={styles.subtitle}>É rápido e fácil!</Animated.Text>

          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome Completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor="#aaa"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Número de Telefone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#aaa"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.inputWrapper}>
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

          <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Crie uma Senha (mín. 6 caracteres)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#aaa"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirme sua Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#aaa"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(800)} style={styles.buttonWrapper}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(900)} style={styles.linkWrapper}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Já tem conta? <Text style={styles.linkTextBold}>Faça login aqui!</Text></Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Updated Styles with Poppins font and refinements
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    alignItems: 'center',
    padding: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 26,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#667',
    marginBottom: 35,
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
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
    height: '100%',
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
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    fontSize: 16,
  },
  linkWrapper: {
      marginTop: 30,
  },
  linkText: {
    fontFamily: 'Poppins-Regular',
    color: '#555',
    fontSize: 14,
  },
  linkTextBold: {
      fontFamily: 'Poppins-SemiBold',
      color: '#6200EE',
  }
});
