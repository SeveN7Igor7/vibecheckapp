import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator
} from 'react-native';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { app } from '../firebaseConfig'; // Adjust path if needed
import { AuthContext } from '../context/AuthContext'; // Adjust path if needed
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

// --- VibeCheck Color Palette ---
const COLORS = {
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#667788',
    storyBorder: '#FF8A00', // Active story border
    myStoryBorder: '#FF8A00', // Border for user's own active story
    storyBorderViewed: '#CCCCCC',
    placeholderBG: '#E0E0E0',
    addStoryIconBG: '#6200EE',
};

// Accept onCreateStory prop
const StoryBar = ({ onStoryPress, onCreateStory }) => {
    const [otherStories, setOtherStories] = useState([]);
    const [myStoryData, setMyStoryData] = useState(null); // State for current user's story data
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const database = getDatabase(app);

    useEffect(() => {
        if (!user?.userId) {
            setLoading(false);
            setOtherStories([]);
            setMyStoryData(null);
            return; // No user, nothing to fetch
        }

        setLoading(true);
        const storiesRef = ref(database, 'stories');
        const listener = onValue(storiesRef, (snapshot) => {
            const data = snapshot.val();
            const activeOtherStories = [];
            let currentUserStory = null;
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
                            userActiveStories.push({ ...story, _id: storyId }); // Add _id
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
                            // Fallback user details (should ideally come from user node or be stored with story)
                            userDetails = { _id: userId, name: `User ${userId.substring(0, 4)}`, avatar: user?.avatar || null };
                        }

                        const processedStoryData = {
                            userId: userId,
                            userName: userDetails.name || `User ${userId.substring(0, 4)}`,
                            userAvatar: userDetails.avatar || user?.avatar || null,
                            stories: userActiveStories.sort((a, b) => a.timestamp - b.timestamp),
                            latestTimestamp: latestTimestamp,
                        };

                        // Separate current user's stories from others
                        if (userId === user.userId) {
                            currentUserStory = processedStoryData;
                        } else {
                            activeOtherStories.push(processedStoryData);
                        }
                    }
                });
            }

            setMyStoryData(currentUserStory); // Set current user's story data (null if no active stories)
            setOtherStories(activeOtherStories.sort((a, b) => b.latestTimestamp - a.latestTimestamp));
            setLoading(false);
        }, (error) => {
            console.error("Firebase read failed for stories: ", error);
            setLoading(false);
        });

        return () => off(storiesRef, 'value', listener);
    }, [user?.userId, user?.avatar]); // Re-run if user ID or avatar changes

    // Don't render the bar if loading and no user (avoids flicker)
    if (loading && !user) {
        return null;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollViewContent}
            >
                {/* "Add Your Story" Button OR "View Your Story" Button */}
                {user && (
                    <TouchableOpacity
                        style={styles.storyItem}
                        // If user has active stories, view them. Otherwise, create one.
                        onPress={() => myStoryData ? onStoryPress(myStoryData) : onCreateStory()}
                    >
                        <View style={myStoryData ? styles.myStoryAvatarContainer : styles.addStoryAvatarContainer}>
                            <Image
                                source={user.avatar ? { uri: user.avatar } : require('../assets/icon.png')} // Use user's avatar
                                style={styles.avatar}
                            />
                            {/* Show '+' icon only if there are no active stories for the user */}
                            {!myStoryData && (
                                <View style={styles.addStoryIconOverlay}>
                                    <Ionicons name="add" size={16} color="#FFFFFF" />
                                </View>
                            )}
                        </View>
                        <Text style={styles.username} numberOfLines={1}>Seu Story</Text>
                    </TouchableOpacity>
                )}

                {/* Loading Indicator for other stories */}
                {loading && otherStories.length === 0 && (
                     <View style={styles.loadingStoriesContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                )}

                {/* Other Users' Stories */}
                {otherStories.map((storyData) => (
                    <TouchableOpacity
                        key={storyData.userId}
                        style={styles.storyItem}
                        onPress={() => onStoryPress(storyData)}
                    >
                        {/* Add viewed state logic here later if needed */}
                        <View style={[styles.avatarContainer]}>
                            <Image
                                source={storyData.userAvatar ? { uri: storyData.userAvatar } : require('../assets/icon.png')}
                                style={styles.avatar}
                            />
                        </View>
                        <Text style={styles.username} numberOfLines={1}>{storyData.userName}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingLeft: 15,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    loadingContainer: { // Used when the whole bar is loading initially
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
    },
    loadingStoriesContainer: { // Used when only other stories are loading
        height: 70, // Match item height
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    scrollViewContent: {
        alignItems: 'center',
    },
    storyItem: {
        alignItems: 'center',
        marginRight: 15,
        width: 70,
    },
    // Style for other users' stories (active)
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2.5,
        borderColor: COLORS.storyBorder, // Orange border for active stories
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        backgroundColor: COLORS.placeholderBG,
    },
    // Style for the user's own story (active)
    myStoryAvatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2.5,
        borderColor: COLORS.myStoryBorder, // Use the same orange border for consistency
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        backgroundColor: COLORS.placeholderBG,
    },
    // Style for the "Add Your Story" button avatar (when no active story)
    addStoryAvatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1.5,
        borderColor: COLORS.textSecondary, // Grey border when no active story
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        position: 'relative',
        backgroundColor: COLORS.placeholderBG,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
    },
    addStoryIconOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.addStoryIconBG,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    username: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
    },
});

export default StoryBar;

