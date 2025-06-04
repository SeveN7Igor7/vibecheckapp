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
    Linking,
    ToastAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getDatabase, ref, onValue, off, push, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { app } from '../firebaseConfig';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import ParsedText from 'react-native-parsed-text';
import * as Clipboard from 'expo-clipboard';

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
    linkColor: '#007AFF',
};

// Helper functions (formatMessageTime, formatDateSeparator) remain the same
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

// --- Regional Chat Screen ---
export default function RegionalChatScreen({ route, navigation }) {
    const { city, state } = route.params; // Get city and state from navigation parameters
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const { user } = useContext(AuthContext);
    const database = getDatabase(app);
    // --- Use regional chat path --- 
    const chatPath = `regionalChats/${state}/${city}`;
    const chatRef = ref(database, chatPath);
    // -----------------------------
    const flatListRef = useRef(null);

    // Set navigation options with regional title
    useEffect(() => {
        navigation.setOptions({
            title: `Chat ${city} - ${state}`,
            headerTitleStyle: styles.headerTitle,
            headerStyle: styles.header,
            headerTintColor: COLORS.textPrimary,
        });
    }, [navigation, city, state]);

    // Load messages from Firebase (using regional path)
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
            console.error(`Firebase read failed for ${chatPath}: `, error);
            setLoading(false);
            Alert.alert("Erro", "Não foi possível carregar as mensagens deste chat regional.");
        });

        return () => off(chatRef, 'value', listener);
    }, [chatPath]); // Depend on chatPath

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    // Handle sending messages (saves to regional path)
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
                // Optionally add user's location to the message itself if needed elsewhere
                // location: user.location 
            },
        };

        push(chatRef, messageData) // Use regional chatRef
            .then(() => {
                setInputText('');
            })
            .catch((error) => {
                console.error(`Failed to send message to ${chatPath}: `, error);
                Alert.alert("Erro", "Não foi possível enviar a mensagem.");
            });

    }, [inputText, user, chatRef, chatPath]); // Include chatRef/chatPath dependencies

    // Handlers for URL press and copy remain the same
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
        if (Platform.OS === 'android') {
            ToastAndroid.show('Mensagem copiada!', ToastAndroid.SHORT);
        } else {
            Alert.alert('Copiado', 'Mensagem copiada para a área de transferência.');
        }
    };

    // Render message item (logic remains the same, styles applied)
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
                <TouchableOpacity
                    onLongPress={() => handleCopyToClipboard(item.text)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer]}>
                        <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
                            {!isCurrentUser && (
                                <Text style={styles.usernameText}>{item.user.name}</Text>
                            )}
                            <ParsedText
                                style={styles.messageText}
                                parse={[
                                    { type: 'url', style: styles.linkText, onPress: handleUrlPress },
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

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando chat de {city}...</Text>
            </SafeAreaView>
        );
    }

    // Main chat view
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
                    ListEmptyComponent={() => ( // Add empty state specific to regional chat
                        <View style={styles.emptyChatContainer}>
                            <Ionicons name="chatbubbles-outline" size={50} color={COLORS.textSecondary} />
                            <Text style={styles.emptyChatText}>Nenhuma mensagem ainda em {city}.</Text>
                            <Text style={styles.emptyChatSubText}>Seja o primeiro a enviar uma vibe!</Text>
                        </View>
                    )}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
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

// Styles (mostly reused from GeneralChatScreen, added empty state styles)
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
        flexGrow: 1, // Important for empty component layout
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
    linkText: {
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
    // Empty Chat Styles
    emptyChatContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyChatText: {
        marginTop: 15,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 17,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    emptyChatSubText: {
        marginTop: 5,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
