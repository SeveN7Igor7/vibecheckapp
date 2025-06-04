import React, { useState, useEffect, useContext, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { getDatabase, ref, onValue, off, push, serverTimestamp } from 'firebase/database'; // Added push, serverTimestamp
import { app } from '../firebaseConfig';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; // Import ImagePicker

// Import Story Components and Utils
import StoryBar from '../components/StoryBar'; // Adjust path if needed
import StoryViewer from '../components/StoryViewer'; // Adjust path if needed
import { uploadImageToCloudinary } from '../utils/cloudinaryUtils'; // Adjust path if needed

// Function to get vibe color and icon (Keep existing)
const getVibeStyle = (vibe) => {
  switch (vibe?.toLowerCase()) {
    case 'bagulho doido':
      return { color: '#FF4500', icon: 'flame', intensity: 5 }; // OrangeRed
    case 'animado':
      return { color: '#FFD700', icon: 'musical-notes', intensity: 4 }; // Gold
    case 'normal':
      return { color: '#1E90FF', icon: 'beer', intensity: 3 }; // DodgerBlue
    case 'parado':
      return { color: '#A9A9A9', icon: 'moon', intensity: 2 }; // DarkGray
    case 'miado':
      return { color: '#8B0000', icon: 'skull', intensity: 1 }; // DarkRed
    default:
      return { color: '#ccc', icon: 'help-circle', intensity: 0 }; // Default gray
  }
};

export default function HomeScreen({ navigation }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const database = getDatabase(app);
  const userCity = user?.location?.city;
  const userState = user?.location?.state;

  // State for Story Viewer
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
  const [allStoriesData, setAllStoriesData] = useState([]); // Store all fetched stories data
  const [selectedStoryUserIndex, setSelectedStoryUserIndex] = useState(0);
  const [isUploadingStory, setIsUploadingStory] = useState(false);

  // --- Fetch All Stories Data for Viewer ---
  useEffect(() => {
    const storiesRef = ref(database, 'stories');
    const listener = onValue(storiesRef, (snapshot) => {
        const data = snapshot.val();
        const activeStories = [];
        const now = Date.now();

        if (data) {
            Object.keys(data).forEach(userId => {
                const userStoriesData = data[userId];
                const userActiveStories = [];
                let latestTimestamp = 0;
                let userDetails = null;

                Object.keys(userStoriesData).forEach(storyId => {
                    const story = userStoriesData[storyId];
                    if (story && story.mediaUrl && story.expiresAt && story.expiresAt > now) {
                        userActiveStories.push({ ...story, _id: storyId }); // Add _id here
                        if (story.timestamp > latestTimestamp) {
                            latestTimestamp = story.timestamp;
                        }
                        if (!userDetails && story.user) {
                            userDetails = story.user;
                        }
                    }
                });

                if (userActiveStories.length > 0) {
                    if (!userDetails) {
                        userDetails = { _id: userId, name: `User ${userId.substring(0, 4)}`, avatar: null };
                    }

                    activeStories.push({
                        userId: userId,
                        userName: userDetails.name || `User ${userId.substring(0, 4)}`,
                        userAvatar: userDetails.avatar || null,
                        stories: userActiveStories.sort((a, b) => a.timestamp - b.timestamp),
                        latestTimestamp: latestTimestamp,
                    });
                }
            });
        }
        setAllStoriesData(activeStories.sort((a, b) => b.latestTimestamp - a.latestTimestamp));
    }, (error) => {
        console.error("Firebase read failed for all stories data: ", error);
    });

    return () => off(storiesRef, 'value', listener);
}, []);

  // --- Story Handling Functions ---
  const handleStoryPress = (storyUserData) => {
      const userIndex = allStoriesData.findIndex(u => u.userId === storyUserData.userId);
      if (userIndex !== -1) {
          setSelectedStoryUserIndex(userIndex);
          setIsStoryViewerVisible(true);
      } else {
          console.warn("Could not find selected user in allStoriesData");
      }
  };

  const handleCloseStoryViewer = () => {
    setIsStoryViewerVisible(false);
  };

  const handleCreateStory = async () => {
    if (isUploadingStory) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão Necessária", "Você precisa permitir o acesso à galeria para postar um story.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
    });

    if (pickerResult.canceled) {
      return;
    }

    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      setIsUploadingStory(true);

      const cloudinaryUrl = await uploadImageToCloudinary(asset.uri, asset.mimeType);

      if (!cloudinaryUrl) {
        Alert.alert("Erro no Upload", "Não foi possível fazer o upload da imagem. Tente novamente.");
        setIsUploadingStory(false);
        return;
      }

      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiration
      const storyData = {
        mediaUrl: cloudinaryUrl,
        mediaType: 'image',
        timestamp: serverTimestamp(),
        createdAt: now,
        expiresAt: expiresAt,
        user: {
          _id: user.userId,
          name: user.fullName || 'Usuário Anônimo',
          avatar: user.avatar || null
        },
      };

      const userStoriesRef = ref(database, `stories/${user.userId}`);
      push(userStoriesRef, storyData)
        .then(() => {
          console.log("Story metadata saved successfully!");
          Alert.alert("Sucesso", "Seu story foi postado!");
        })
        .catch((error) => {
          console.error("Failed to save story metadata: ", error);
          Alert.alert("Erro", "Não foi possível salvar os dados do story.");
        })
        .finally(() => {
          setIsUploadingStory(false);
        });
    }
  };

  // Set header options dynamically
  useLayoutEffect(() => {
    navigation.setOptions({
      title: userCity ? `Vibes em ${userCity}` : 'VibeCheck',
      headerLeft: () => (
          // Placeholder for 'Add Story' button - Will be moved to StoryBar later
          <TouchableOpacity onPress={handleCreateStory} style={styles.headerIconLeft} disabled={isUploadingStory}>
              {isUploadingStory ? (
                  <ActivityIndicator size="small" color="#6200EE" />
              ) : (
                  <Ionicons name="add-circle-outline" size={28} color="#333" />
              )}
          </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerIconsContainer}>
          <TouchableOpacity
            onPress={() => {
              if (userCity && userState) {
                navigation.navigate('RegionalChat', { city: userCity, state: userState });
              } else {
                Alert.alert("Localização Necessária", "Defina sua localização no perfil para acessar o chat regional.");
              }
            }}
            style={styles.headerIcon}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={28} color="#333" />
          </TouchableOpacity>
        </View>
      ),
      headerTitleStyle: styles.headerTitle,
      headerStyle: styles.header,
    });
  }, [navigation, userCity, userState, isUploadingStory]);

  // Fetch Places Logic
  const fetchPlaces = useCallback(() => {
    if (!userCity || !userState) {
        console.warn("User location not set, cannot fetch places for region.");
        setPlaces([]);
        setLoading(false);
        setRefreshing(false);
        return () => {};
    }
    const placesRef = ref(database, 'places');
    setLoading(true);

    const listener = onValue(placesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedPlaces = [];
      if (data) {
          loadedPlaces = Object.keys(data)
              .map(key => ({ id: key, ...data[key] }))
              .filter(place => place.city === userCity && place.state === userState);
      }
      loadedPlaces.sort((a, b) => {
          const timeA = a.lastReviewTimestamp ? new Date(a.lastReviewTimestamp).getTime() : 0;
          const timeB = b.lastReviewTimestamp ? new Date(b.lastReviewTimestamp).getTime() : 0;
          return timeB - timeA;
      });
      setPlaces(loadedPlaces);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Firebase read failed: " + error.message);
      Alert.alert("Erro", "Não foi possível carregar os locais.");
      setLoading(false);
      setRefreshing(false);
    });

    return () => off(placesRef, 'value', listener);
  }, [userCity, userState, database]);

  useEffect(() => {
    const unsubscribe = fetchPlaces();
    return unsubscribe;
  }, [fetchPlaces]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces();
  };

  const renderPlaceItem = ({ item, index }) => {
    const vibeStyle = getVibeStyle(item.currentVibe);
    const isHighVibe = vibeStyle.intensity >= 4;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 100).duration(400)}
        layout={Layout.springify()}
        style={[styles.itemContainer, isHighVibe && styles.highVibeBorder]}
      >
        <TouchableOpacity
          style={styles.touchableArea}
          onPress={() => navigation.navigate('PlaceDetail', { placeId: item.id })}
        >
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.address}</Text>
          </View>
          <View style={styles.itemVibeContainer}>
            <Ionicons name={vibeStyle.icon} size={24} color={vibeStyle.color} />
            <Text style={[styles.itemVibeText, { color: vibeStyle.color }]}>
              {item.currentVibe || 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Loading and Empty States
  if (loading && places.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Carregando locais em {userCity || 'sua região'}...</Text>
      </SafeAreaView>
    );
  }

  if (!userCity || !userState) {
      return (
          <SafeAreaView style={styles.centeredEmpty}>
              <Ionicons name="navigate-circle-outline" size={50} color="#aaa" />
              <Text style={styles.emptyText}>Defina sua localização</Text>
              <Text style={styles.emptySubText}>Vá até o seu perfil para selecionar seu estado e cidade.</Text>
              <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                  <Text style={styles.profileButtonText}>Ir para o Perfil</Text>
              </TouchableOpacity>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Story Section */}
      <View style={styles.storySectionContainer}>
        {/* Pass handleCreateStory to StoryBar */}
        <StoryBar onStoryPress={handleStoryPress} onCreateStory={handleCreateStory} />
      </View>

      {/* Places Section */}
      <View style={styles.placesSectionContainer}>
        <Text style={styles.sectionTitle}>Locais em {userCity}</Text>
        <FlatList
          data={places}
          renderItem={renderPlaceItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={() => (
            <View style={styles.centeredEmptyList}>
              <Ionicons name="sad-outline" size={50} color="#aaa" />
              <Text style={styles.emptyText}>Nenhum local encontrado</Text>
              <Text style={styles.emptySubText}>Ainda não há locais cadastrados ou avaliados em {userCity}. Seja o primeiro!</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200EE"]} tintColor={"#6200EE"}/>
          }
        />
      </View>

      {/* StoryViewer Modal */}
      <StoryViewer
        isVisible={isStoryViewerVisible}
        storiesData={allStoriesData}
        initialStoryIndex={selectedStoryUserIndex}
        onClose={handleCloseStoryViewer}
      />
    </SafeAreaView>
  );
}

// Updated Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    padding: 20,
  },
  loadingText: {
      marginTop: 10,
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
      color: '#667',
      textAlign: 'center',
  },
  centeredEmpty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  centeredEmptyList: {
      flexGrow: 1, // Ensure it takes space within FlatList
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      marginTop: '10%', // Adjust as needed
  },
  emptyText: {
      marginTop: 15,
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: '#555',
      textAlign: 'center',
  },
  emptySubText: {
      marginTop: 5,
      fontFamily: 'Poppins-Regular',
      fontSize: 14,
      color: '#778',
      textAlign: 'center',
      marginBottom: 20,
  },
  profileButton: {
      marginTop: 15,
      backgroundColor: '#6200EE',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
  },
  profileButtonText: {
      fontFamily: 'Poppins-Medium',
      fontSize: 14,
      color: '#fff',
  },
  // New Layout Styles
  storySectionContainer: {
    // StoryBar already has padding and border, keep this minimal
    // backgroundColor: '#fff', // Optional: Add background if needed
    // borderBottomWidth: 1,
    // borderBottomColor: '#E0E0E0',
    // marginBottom: 10, // Add space below stories
  },
  placesSectionContainer: {
    flex: 1, // Take remaining space
    paddingHorizontal: 15, // Horizontal padding for the section
    paddingTop: 15, // Space above the title
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 15, // Space below title
  },
  listContentContainer: {
    paddingBottom: 30, // Padding at the bottom of the list
    flexGrow: 1, // Make sure empty list component centers
  },
  // Existing Item Styles (minor adjustments if needed)
  itemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  highVibeBorder: {
      borderColor: '#FFD700',
      shadowColor: '#FFD700',
      shadowOpacity: 0.2,
      elevation: 5,
  },
  touchableArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  itemTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    color: '#333',
    marginBottom: 3,
  },
  itemSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#667',
  },
  itemVibeContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  itemVibeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // Header Styles (Keep existing)
  headerIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  headerIcon: {
    marginLeft: 15,
  },
  headerIconLeft: {
      marginLeft: 15,
  },
  header: {
      backgroundColor: '#F0F4F8',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
  },
  headerTitle: {
      fontFamily: 'Poppins-Bold',
      fontSize: 20,
      color: '#333',
      textAlign: 'center',
  },
});

