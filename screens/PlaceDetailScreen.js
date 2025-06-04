import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { app } from '../firebaseConfig';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Function to get vibe color and icon (same as HomeScreen)
const getVibeStyle = (vibe) => {
  switch (vibe?.toLowerCase()) {
    case 'bagulho doido':
      return { color: '#FF4500', icon: 'flame', intensity: 5 };
    case 'animado':
      return { color: '#FFD700', icon: 'musical-notes', intensity: 4 };
    case 'normal':
      return { color: '#1E90FF', icon: 'beer', intensity: 3 };
    case 'parado':
      return { color: '#A9A9A9', icon: 'moon', intensity: 2 };
    case 'miado':
      return { color: '#8B0000', icon: 'skull', intensity: 1 };
    default:
      return { color: '#ccc', icon: 'help-circle', intensity: 0 };
  }
};

export default function PlaceDetailScreen({ route, navigation }) {
  const { placeId } = route.params;
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const database = getDatabase(app);

  useEffect(() => {
    const placeRef = ref(database, `places/${placeId}`);
    setLoading(true);

    const listener = onValue(placeRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlaceDetails({ id: placeId, ...snapshot.val() });
      } else {
        Alert.alert("Erro", "Local não encontrado.");
        navigation.goBack(); // Go back if place doesn't exist
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase read failed: " + error.message);
      Alert.alert("Erro", "Não foi possível carregar os detalhes do local.");
      setLoading(false);
      navigation.goBack();
    });

    // Cleanup listener on unmount
    return () => off(placeRef, 'value', listener);
  }, [placeId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (!placeDetails) {
    // This case should ideally be handled by the error alert and navigation.goBack
    return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>Não foi possível carregar os detalhes.</Text>
        </View>
    );
  }

  const vibeStyle = getVibeStyle(placeDetails.currentVibe);
  const isHighVibe = vibeStyle.intensity >= 4;

  const timeAgo = placeDetails.lastReviewTimestamp
    ? formatDistanceToNow(new Date(placeDetails.lastReviewTimestamp), { addSuffix: true, locale: ptBR })
    : 'Nenhuma avaliação ainda';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      {/* Placeholder for an image - could fetch from storage or use a default */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.imagePlaceholder}>
          <Ionicons name="map-outline" size={80} color="#bbb" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.contentContainer}>
        <Text style={styles.title}>{placeDetails.name}</Text>
        <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#555" style={styles.icon} />
            <Text style={styles.infoText}>{placeDetails.address}</Text>
        </View>
        <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={20} color="#555" style={styles.icon} />
            <Text style={styles.infoText}>{placeDetails.type || 'Não especificado'}</Text>
        </View>

        <Animated.View entering={ZoomIn.delay(300).duration(400)} style={[styles.vibeContainer, isHighVibe && styles.highVibeBackground]}>
          <Text style={styles.vibeTitle}>Vibe Atual</Text>
          <View style={styles.vibeInfoRow}>
            <Ionicons name={vibeStyle.icon} size={35} color={isHighVibe ? '#fff' : vibeStyle.color} />
            <Text style={[styles.vibeText, { color: isHighVibe ? '#fff' : vibeStyle.color }]}>
              {placeDetails.currentVibe || 'Indefinida'}
            </Text>
          </View>
          <Text style={[styles.lastReviewText, isHighVibe && { color: '#eee' }]}>Última avaliação: {timeAgo}</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('AddReview', { placeId: placeId, placeName: placeDetails.name })}
          >
            <Ionicons name="thumbs-up-outline" size={20} color="#ffffff" style={{ marginRight: 8 }}/>
            <Text style={styles.buttonText}>Avaliar a Vibe Agora</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Placeholder for recent reviews list or other details */}
        {/* <Text style={styles.sectionTitle}>Avaliações Recentes</Text> */}

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
      paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  loadingText: {
      marginTop: 10,
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
      color: '#667',
  },
  errorText: {
      fontFamily: 'Poppins-Medium',
      fontSize: 16,
      color: '#D32F2F',
  },
  imagePlaceholder: {
      height: 200,
      backgroundColor: '#E3E8EF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 0, // Remove margin if content starts right below
  },
  contentContainer: {
    padding: 20,
    backgroundColor: '#F0F4F8', // Match background
    borderTopLeftRadius: 20, // Optional: curve top corners if image is above
    borderTopRightRadius: 20,
    marginTop: -20, // Overlap image slightly for effect
    zIndex: 1,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingHorizontal: 10, // Add some horizontal padding
  },
  icon: {
      marginRight: 10,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#555',
    flexShrink: 1, // Allow text to wrap
  },
  vibeContainer: {
    marginTop: 25,
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  highVibeBackground: {
      backgroundColor: '#6200EE', // Use primary color for high vibe background
      borderColor: '#6200EE',
      shadowColor: '#6200EE',
      shadowOpacity: 0.3,
  },
  vibeTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#444',
    marginBottom: 15,
  },
  vibeInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
  },
  vibeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    marginLeft: 10,
  },
  lastReviewText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#778',
    marginTop: 5,
  },
  buttonWrapper: {
      marginTop: 10, // Adjust spacing
      paddingHorizontal: 10, // Align button padding
  },
  button: {
    flexDirection: 'row',
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
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    fontSize: 16,
  },
  sectionTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: '#333',
      marginTop: 30,
      marginBottom: 15,
      paddingHorizontal: 10,
  },
});
