import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown, Layout, ZoomIn } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { getDatabase, ref, push, update, query, orderByChild, equalTo, get, limitToLast } from 'firebase/database';
import { app } from '../firebaseConfig';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Vibe options with styles (similar to HomeScreen)
const vibeOptions = [
  { name: 'Bagulho Doido', style: { color: '#FF4500', icon: 'flame' } },
  { name: 'Animado', style: { color: '#FFD700', icon: 'musical-notes' } },
  { name: 'Normal', style: { color: '#1E90FF', icon: 'beer' } },
  { name: 'Parado', style: { color: '#A9A9A9', icon: 'moon' } },
  { name: 'Miado', style: { color: '#8B0000', icon: 'skull' } },
];

export default function AddReviewScreen({ route, navigation }) {
  const { placeId, placeName } = route.params;
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState({ total: 0, recentVibes: {} });
  const { user } = useContext(AuthContext);
  const database = getDatabase(app);

  // Fetch recent review statistics
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      const reviewsRef = ref(database, 'reviews');
      // Query requires index on placeId in Firebase rules
      const placeReviewsQuery = query(
        reviewsRef,
        orderByChild('placeId'),
        equalTo(placeId),
        limitToLast(20) // Limit to last 20 reviews for stats
      );

      try {
        const snapshot = await get(placeReviewsQuery);
        let total = 0;
        const recentVibes = {};
        if (snapshot.exists()) {
          const reviewsData = snapshot.val();
          Object.values(reviewsData).forEach(review => {
            total++;
            recentVibes[review.vibe] = (recentVibes[review.vibe] || 0) + 1;
          });
        }
        setReviewStats({ total, recentVibes });
      } catch (error) {
        console.error('Error fetching review stats:', error);
        // Don't block submission if stats fail, but maybe show a message
        // Alert.alert("Erro", "Não foi possível carregar as estatísticas de reviews.");
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [placeId]);

  const handleSubmitReview = async () => {
    if (!selectedVibe) {
      Alert.alert('Selecione a Vibe', 'Por favor, escolha como está a vibe do local.');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não identificado. Faça login novamente.');
      return;
    }

    Keyboard.dismiss(); // Dismiss keyboard if open
    setLoading(true);
    setLocationLoading(true);

    let location = null;
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos da sua localização para confirmar o check-in.');
        setLoading(false);
        setLocationLoading(false);
        return;
      }
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocationLoading(false);

    } catch (error) {
      console.error('Location Error:', error);
      Alert.alert('Erro de Localização', 'Não foi possível obter sua localização.');
      setLoading(false);
      setLocationLoading(false);
      return;
    }

    const reviewData = {
      placeId: placeId,
      userId: user.userId, // Use sanitized email or a generated ID from AuthContext
      vibe: selectedVibe.name,
      timestamp: new Date().toISOString(),
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };

    const vibeStyle = vibeOptions.find(v => v.name === selectedVibe.name)?.style;
    const vibeLevel = vibeStyle ? Object.values(vibeOptions).findIndex(v => v.name === selectedVibe.name) : 0; // Simple level based on order

    const updates = {};
    const newReviewKey = push(ref(database, 'reviews')).key;
    updates[`/reviews/${newReviewKey}`] = reviewData;
    updates[`/places/${placeId}/currentVibe`] = selectedVibe.name;
    updates[`/places/${placeId}/currentVibeLevel`] = 5 - vibeLevel; // Higher level for better vibes (0=Miado, 4=Bagulho Doido)
    updates[`/places/${placeId}/lastReviewTimestamp`] = reviewData.timestamp;

    try {
      await update(ref(database), updates);
      Alert.alert('Avaliação Enviada!', 'Obrigado por compartilhar a vibe!');
      navigation.goBack();
    } catch (error) {
      console.error('Submit Review Error:', error);
      Alert.alert('Erro ao Enviar', 'Não foi possível enviar sua avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContainer}>
        <Text style={styles.placeName}>{placeName}</Text>
        <Text style={styles.title}>Como está a vibe agora?</Text>
      </Animated.View>

      {/* Review Statistics Section */}
      <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Vibes Recentes (últimas {reviewStats.total})</Text>
        {statsLoading ? (
          <ActivityIndicator color="#6200EE" style={{ marginTop: 10 }}/>
        ) : reviewStats.total > 0 ? (
          <View style={styles.statsBarsContainer}>
            {vibeOptions.map((vibe, index) => {
              const count = reviewStats.recentVibes[vibe.name] || 0;
              const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
              return (
                <View key={index} style={styles.statBarWrapper}>
                  <Ionicons name={vibe.style.icon} size={18} color={vibe.style.color} style={styles.statIcon}/>
                  <View style={styles.statBarBackground}>
                    <Animated.View
                      style={[styles.statBarFill, { width: `${percentage}%`, backgroundColor: vibe.style.color }]}
                      layout={Layout.springify()}
                    />
                  </View>
                  <Text style={styles.statLabel}>{`${count} (${percentage.toFixed(0)}%)`}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noStatsText}>Nenhuma avaliação recente para exibir estatísticas.</Text>
        )}
      </Animated.View>

      {/* Vibe Selection Section */}
      <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.vibeSelectionContainer}>
        {vibeOptions.map((vibe, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.vibeButton,
              selectedVibe?.name === vibe.name && styles.vibeButtonSelected,
            ]}
            onPress={() => setSelectedVibe(vibe)}
          >
            <Ionicons
                name={vibe.style.icon}
                size={28}
                color={selectedVibe?.name === vibe.name ? '#fff' : vibe.style.color}
                style={styles.vibeIcon}
            />
            <Text
              style={[
                styles.vibeButtonText,
                selectedVibe?.name === vibe.name && styles.vibeButtonTextSelected,
              ]}
            >
              {vibe.name}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.buttonWrapper}>
        <TouchableOpacity
          style={[styles.submitButton, (loading || locationLoading || !selectedVibe) && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={loading || locationLoading || !selectedVibe}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : locationLoading ? (
            <Text style={styles.submitButtonText}>Verificando localização...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Confirmar Vibe</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// Updated Styles with Poppins font and refinements
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  placeName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 22,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  title: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#667',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statsTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsBarsContainer: {
    // Styles for the container of stat bars
  },
  statBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
      width: 25, // Fixed width for alignment
      textAlign: 'center',
      marginRight: 5,
  },
  statBarBackground: {
    flex: 1,
    height: 10, // Bar height
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 8,
  },
  statBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#667',
    minWidth: 60, // Ensure space for text
    textAlign: 'right',
  },
  noStatsText: {
      fontFamily: 'Poppins-Regular',
      fontSize: 14,
      color: '#778',
      textAlign: 'center',
      marginTop: 10,
  },
  vibeSelectionContainer: {
    marginBottom: 30,
  },
  vibeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#D1D9E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vibeButtonSelected: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
    shadowColor: '#6200EE',
    shadowOpacity: 0.2,
    elevation: 4,
  },
  vibeIcon: {
      marginRight: 15,
  },
  vibeButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#333',
    flex: 1, // Take remaining space
  },
  vibeButtonTextSelected: {
    color: '#ffffff',
  },
  buttonWrapper: {
    marginTop: 10,
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowColor: '#BDBDBD',
    elevation: 0,
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    fontSize: 16,
  },
});

