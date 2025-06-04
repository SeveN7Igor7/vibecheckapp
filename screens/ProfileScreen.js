import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image, // Added Image
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, query, orderByChild, equalTo, get, limitToLast, update } from 'firebase/database'; // Added update
import { app } from '../firebaseConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker'; // Added ImagePicker
import { uploadImageToCloudinary } from '../utils/cloudinaryUtils'; // Added Cloudinary util

export default function ProfileScreen({ navigation }) {
  // Use updateUserContext from AuthContext
  const { user, logout, updateUserContext } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [lastReview, setLastReview] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false); // State for avatar upload
  const database = getDatabase(app);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user?.userId) return;
      setStatsLoading(true);
      const reviewsRef = ref(database, 'reviews');
      const userReviewsQuery = query(
        reviewsRef,
        orderByChild('userId'),
        equalTo(user.userId),
        limitToLast(1)
      );
      const userReviewsCountQuery = query(
          reviewsRef,
          orderByChild('userId'),
          equalTo(user.userId)
      );

      try {
        const countSnapshot = await get(userReviewsCountQuery);
        setReviewCount(countSnapshot.exists() ? Object.keys(countSnapshot.val()).length : 0);

        const lastReviewSnapshot = await get(userReviewsQuery);
        if (lastReviewSnapshot.exists()) {
          const lastReviewData = Object.values(lastReviewSnapshot.val())[0];
          setLastReview(lastReviewData);
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchUserStats();
  }, [user?.userId]); // Depend on userId

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      Alert.alert('Erro no Logout', 'Não foi possível sair. Tente novamente.');
      console.error('Logout Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Avatar Change ---
  const handleChooseAvatar = async () => {
    if (isUploadingAvatar) return;

    // 1. Request Permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão Necessária", "Você precisa permitir o acesso à galeria para mudar a foto.");
      return;
    }

    // 2. Launch Image Picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pictures
      quality: 0.6, // Slightly lower quality for avatars
    });

    // 3. Handle Picker Result
    if (pickerResult.canceled) {
      return;
    }

    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      setIsUploadingAvatar(true);

      try {
        // 4. Upload to Cloudinary
        const cloudinaryUrl = await uploadImageToCloudinary(asset.uri, asset.mimeType);

        if (!cloudinaryUrl) {
          throw new Error("Falha no upload para Cloudinary");
        }

        // 5. Update Firebase Realtime Database
        const userRef = ref(database, `users/${user.userId}`);
        await update(userRef, { avatar: cloudinaryUrl });

        // 6. Update Auth Context
        updateUserContext({ avatar: cloudinaryUrl });

        Alert.alert("Sucesso", "Sua foto de perfil foi atualizada!");

      } catch (error) {
        console.error("Failed to update avatar: ", error);
        Alert.alert("Erro", `Não foi possível atualizar a foto: ${error.message}`);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };
  // --- End Handle Avatar Change ---

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Usuário não encontrado.</Text>
      </View>
    );
  }

  const formattedLastReviewDate = lastReview?.timestamp
    ? format(new Date(lastReview.timestamp), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })
    : 'Nenhuma avaliação ainda';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.profileHeader}>
        {/* Avatar Section */}
        <TouchableOpacity onPress={handleChooseAvatar} disabled={isUploadingAvatar} style={styles.avatarContainer}>
          {isUploadingAvatar ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Image
              source={user.avatar ? { uri: user.avatar } : require('../assets/icon.png')} // Use user.avatar or default
              style={styles.avatarImage}
            />
          )}
          <View style={styles.avatarEditIconContainer}>
            <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        {/* End Avatar Section */}

        <Text style={styles.userName}>{user.fullName || 'Usuário VibeCheck'}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Suas Estatísticas</Text>
        {statsLoading ? (
            <ActivityIndicator color="#6200EE" style={{ marginVertical: 10 }}/>
        ) : (
            <>
                <View style={styles.statItem}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" style={styles.statIcon}/>
                    <Text style={styles.statValue}>{reviewCount}</Text>
                    <Text style={styles.statLabel}>Avaliações Feitas</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={24} color="#1E90FF" style={styles.statIcon}/>
                    <Text style={styles.statLabel}>Última Avaliação:</Text>
                    <Text style={styles.statValueSmall}>{formattedLastReviewDate}</Text>
                </View>
            </>
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.logoutButtonWrapper}>
        <TouchableOpacity
          style={[styles.logoutButton, loading && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#D32F2F" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{ marginRight: 8 }}/>
              <Text style={styles.logoutButtonText}>Sair da Conta</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// Updated Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollContentContainer: {
      padding: 20,
      paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  errorText: {
      fontFamily: 'Poppins-Medium',
      fontSize: 16,
      color: '#D32F2F',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  // Avatar Styles
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0', // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative', // Needed for the edit icon overlay
    borderWidth: 3,
    borderColor: '#6200EE',
    overflow: 'hidden', // Clip the image inside
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 6,
    borderRadius: 15,
  },
  // End Avatar Styles
  userName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: '#333',
    marginTop: 5, // Reduced margin due to avatar spacing
  },
  userEmail: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#667',
    marginTop: 5,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  statsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#444',
    marginBottom: 15,
    textAlign: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 5,
  },
  statIcon: {
      marginRight: 12,
      width: 24,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#333',
    marginRight: 8,
  },
   statValueSmall: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#555',
    flexShrink: 1,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  logoutButtonWrapper: {
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    height: 55,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  logoutButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#D32F2F',
    fontSize: 16,
  },
});

