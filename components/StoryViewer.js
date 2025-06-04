import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    Image,
    Platform // <-- Added Platform import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Stories from '@birdwingo/react-native-instagram-stories';

// --- VibeCheck Color Palette (reuse or import) ---
const COLORS = {
    primary: '#6200EE',
    background: '#000000', // Usually black background for stories
    surface: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    loadingIndicator: '#FFFFFF',
    closeButton: '#FFFFFF',
    placeholderBG: '#333333',
};

const StoryViewer = ({ isVisible, storiesData, onClose, initialStoryIndex = 0 }) => {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialStoryIndex);
    const storiesRef = useRef(null);

    useEffect(() => {
        // Reset index when visibility changes or initial index changes
        setCurrentUserIndex(initialStoryIndex);
    }, [isVisible, initialStoryIndex]);

    if (!isVisible || !storiesData || storiesData.length === 0) {
        return null;
    }

    // Transform data for the Stories component
    const formattedStories = storiesData.map(userData => ({
        id: userData.userId,
        imgUrl: userData.userAvatar || 'https://via.placeholder.com/100', // Placeholder avatar
        name: userData.userName,
        stories: userData.stories.map(story => ({
            id: story._id, // Assuming story has an _id from Firebase key
            imgUrl: story.mediaUrl, // The Cloudinary URL
            type: story.mediaType || 'image', // Default to image if not specified
            duration: story.duration || 10, // Default duration (seconds)
            // Add swipeText, onPress etc. if needed later
        }))
    }));

    const handleNextUser = () => {
        if (currentUserIndex < formattedStories.length - 1) {
            setCurrentUserIndex(currentUserIndex + 1);
        } else {
            onClose(); // Close if it's the last user
        }
    };

    const handlePrevUser = () => {
        if (currentUserIndex > 0) {
            setCurrentUserIndex(currentUserIndex - 1);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {formattedStories.length > 0 ? (
                        <Stories
                            ref={storiesRef}
                            stories={formattedStories}
                            currentUserIndex={currentUserIndex}
                            onUserNext={handleNextUser}
                            onUserPrevious={handlePrevUser}
                            onComplete={onClose}
                            storyContainerStyle={styles.storyContainer}
                            imageStyle={styles.storyImage}
                            progressBarStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                            progressBarActiveStyle={{ backgroundColor: COLORS.surface }}
                            renderLoadingComponent={() => (
                                <ActivityIndicator size="large" color={COLORS.loadingIndicator} />
                            )}
                        />
                    ) : (
                        <View style={styles.loadingView}>
                            <ActivityIndicator size="large" color={COLORS.loadingIndicator} />
                        </View>
                    )}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={30} color={COLORS.closeButton} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        position: 'relative',
    },
    storyContainer: {
        backgroundColor: COLORS.background,
    },
    storyImage: {
        resizeMode: 'contain',
        width: '100%', // Explicitly set width
        height: '100%', // Explicitly set height
    },
    loadingView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 15 : 25, // Now Platform is imported
        right: 15,
        zIndex: 10,
        padding: 5,
    },
});

export default StoryViewer;

