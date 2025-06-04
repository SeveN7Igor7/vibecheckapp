import React, { useState, useCallback, useEffect, useContext, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Linking, // Import Linking
    ToastAndroid // For copy feedback on Android (optional)
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getDatabase, ref, onValue, off, push, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { app } from '../firebaseConfig';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import ParsedText from 'react-native-parsed-text'; // Import ParsedText
import * as Clipboard from 'expo-clipboard'; // Import Clipboard

// --- VibeCheck Color Palette ---
const COLORS = {
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#667788',
    currentUserBubble: '#E1D4FA',
    otherUserBubble: '#FFFFFF',
    accent: '#FFD700',
    inputBackground: '#FFFFFF',
    sendButton: '#6200EE',
    dateSeparatorBackground: 'rgba(0, 0, 0, 0.05)',
    dateSeparatorText: '#667788',
    usernameColor: '#6200EE',
    linkColor: '#007AFF', // Standard link color
};

// Helper function to format timestamp
const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'number' ? new Date(timestamp) : (timestamp?.seconds ? new Date(timestamp.seconds * 1000) : parseISO(timestamp));
        return format(date, 'HH:mm');
    } catch (error) {
        console.error("Error formatting time:", error, "Timestamp:", timestamp);
        return '';
    }
};

// Helper function to format date separator
const formatDateSeparator = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'number' ? new Date(timestamp) : (timestamp?.seconds ? new Date(timestamp.seconds * 1000) : parseISO(timestamp));
        return format(date, 'dd MMMM yyyy', { locale: ptBR });
    } catch (error) {
        console.error("Error formatting date separator:", error, "Timestamp:", timestamp);
        return '';
    }
};

export default function GeneralChatScreen({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const { user } = useContext(AuthContext);
    const database = getDatabase(app);
    const chatRef = ref(database, 'generalChat');
    const flatListRef = useRef(null);

    // Set navigation options
    useEffect(() => {
        navigation.setOptions({
            title: 'Chat Geral VibeCheck',
            headerTitleStyle: styles.headerTitle,
            headerStyle: styles.header,
            headerTintColor: COLORS.textPrimary,
        });
    }, [navigation]);

    // Load messages from Firebase
    useEffect(() => {
        setLoading(true);
        const messagesQuery = query(chatRef, orderByChild('createdAt'), limitToLast(100));

        const listener = onValue(messagesQuery, (snapshot) => {
            const data = snapshot.val();
            const loadedMessages = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    const msg = data[key];
                    if (msg && msg.text && msg.createdAt && msg.user && msg.user._id) {
                        loadedMessages.push({
                            _id: key,
                            text: msg.text,
                            createdAt: msg.createdAt,
                            user: {
                                _id: msg.user._id,
                                name: msg.user.name || 'Usuário Anônimo',
                            },
                        });
                    } else {
                        console.warn("Skipping malformed message:", key, msg);
                    }
                });
            }
            setMessages(loadedMessages.sort((a, b) => a.createdAt - b.createdAt));
            setLoading(false);
        }, (error) => {
            console.error("Firebase read failed: ", error);
            setLoading(false);
            Alert.alert("Erro", "Não foi possível carregar as mensagens.");
        });

        return () => off(chatRef, 'value', listener);
    }, []);

    // Scroll to bottom when messages change (MODIFIED)
    useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            // Removed setTimeout for initial testing
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Handle sending messages
    const onSend = useCallback(() => {
        if (inputText.trim().length === 0) return;
        if (!user) {
            Alert.alert("Erro", "Você precisa estar logado para enviar mensagens.");
            return;
        }

        const messageData = {
            text: inputText.trim(),
            createdAt: serverTimestamp(),
            user: {
                _id: user.userId,
                name: user.fullName || 'Usuário Anônimo',
            },
        };

        push(chatRef, messageData)
            .then(() => {
                setInputText('');
            })
            .catch((error) => {
                console.error("Failed to send message: ", error);
                Alert.alert("Erro", "Não foi possível enviar a mensagem.");
            });

    }, [inputText, user]);

    // --- New Functionality Handlers ---
    const handleUrlPress = (url) => {
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert('Erro', `Não é possível abrir este URL: ${url}`);
            }
        });
    };

    const handleCopyToClipboard = async (text) => {
        await Clipboard.setStringAsync(text);
        // Optional: Show feedback
        if (Platform.OS === 'android') {
            ToastAndroid.show('Mensagem copiada!', ToastAndroid.SHORT);
        } else {
            Alert.alert('Copiado', 'Mensagem copiada para a área de transferência.');
        }
    };
    // --- End New Functionality Handlers ---

    // Render each message item
    const renderMessageItem = ({ item, index }) => {
        const isCurrentUser = item.user._id === user?.userId;
        const showDateSeparator = index === 0 || !isSameDay(new Date(messages[index - 1].createdAt), new Date(item.createdAt));

        return (
            <View>
                {showDateSeparator && (
                    <View style={styles.dateSeparatorContainer}>
                        <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.createdAt)}</Text>
                    </View>
                )}
                <TouchableOpacity // Wrap bubble in TouchableOpacity for long press
                    onLongPress={() => handleCopyToClipboard(item.text)}
                    activeOpacity={0.8} // Adjust opacity on long press
                >
                    <View style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer]}>
                        <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
                            {!isCurrentUser && (
                                <Text style={styles.usernameText}>{item.user.name}</Text>
                            )}
                            {/* Use ParsedText for message content */}
                            <ParsedText
                                style={styles.messageText}
                                parse={[
                                    { type: 'url', style: styles.linkText, onPress: handleUrlPress },
                                    // Add other patterns like email, phone if needed
                                ]}
                                childrenProps={{ allowFontScaling: false }}
                            >
                                {item.text}
                            </ParsedText>
                            <Text style={styles.timeText}>{formatMessageTime(item.createdAt)}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando mensagens...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessageItem}
                    keyExtractor={item => item._id}
                    style={styles.messageList}
                    contentContainerStyle={styles.messageListContent}
                    // Removed onContentSizeChange and onLayout props (MODIFIED)
                    // onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    // onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Digite sua vibe..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={onSend}>
                        <Ionicons name="paper-plane-outline" size={24} color={COLORS.surface} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- Styles with Link Style ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 10,
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    header: {
        backgroundColor: COLORS.surface,
        elevation: 1,
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { height: 1, width: 0 },
        borderBottomWidth: 0,
    },
    headerTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    messageContainer: {
        marginVertical: 6,
        maxWidth: '85%',
    },
    currentUserMessageContainer: {
        alignSelf: 'flex-end',
    },
    otherUserMessageContainer: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        elevation: 1,
        shadowOpacity: 0.05,
        shadowRadius: 1,
        shadowOffset: { height: 1, width: 0 },
    },
    currentUserBubble: {
        backgroundColor: COLORS.currentUserBubble,
        borderTopRightRadius: 5,
    },
    otherUserBubble: {
        backgroundColor: COLORS.otherUserBubble,
        borderTopLeftRadius: 5,
    },
    usernameText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
        color: COLORS.usernameColor,
        marginBottom: 4,
    },
    messageText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 21,
    },
    linkText: { // Style for links
        color: COLORS.linkColor,
        textDecorationLine: 'underline',
    },
    timeText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: COLORS.textSecondary,
        alignSelf: 'flex-end',
        marginTop: 5,
        marginLeft: 10,
    },
    dateSeparatorContainer: {
        alignSelf: 'center',
        marginVertical: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: COLORS.dateSeparatorBackground,
        borderRadius: 15,
    },
    dateSeparatorText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: COLORS.dateSeparatorText,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#EAEAEA',
        backgroundColor: COLORS.surface,
    },
    textInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: COLORS.inputBackground,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 10,
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        marginRight: 10,
        color: COLORS.textPrimary,
    },
    sendButton: {
        backgroundColor: COLORS.sendButton,
        borderRadius: 22,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { height: 1, width: 0 },
    },
});

