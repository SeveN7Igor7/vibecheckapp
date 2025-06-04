import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import { AuthContext } from '../context/AuthContext';
import { getDatabase, ref, update } from 'firebase/database';
import { app } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// --- VibeCheck Color Palette ---
const COLORS = {
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#667788',
    error: '#B00020',
    buttonText: '#FFFFFF',
};

// --- Location Data (Start with PI/Teresina) ---
const states = [
    { label: 'Piauí', value: 'PI' },
    // Add other states later
];

const citiesByState = {
    PI: [
        { label: 'Teresina', value: 'Teresina' },
        // Add other cities in PI later
    ],
    // Add other states/cities later
};

export default function LocationSelectionScreen({ navigation }) {
    const [selectedState, setSelectedState] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [cities, setCities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user, updateUserLocation } = useContext(AuthContext); // Assuming updateUserLocation exists in context
    const database = getDatabase(app);

    const handleStateChange = (value) => {
        setSelectedState(value);
        setSelectedCity(null); // Reset city when state changes
        setCities(citiesByState[value] || []);
    };

    const handleSaveLocation = async () => {
        if (!selectedState || !selectedCity) {
            Alert.alert('Seleção Incompleta', 'Por favor, selecione seu estado e cidade.');
            return;
        }

        if (!user || !user.userId) {
            Alert.alert('Erro', 'Usuário não identificado. Tente fazer login novamente.');
            return;
        }

        setIsLoading(true);
        const userProfileRef = ref(database, `users/${user.userId}`);
        const locationData = {
            state: selectedState,
            city: selectedCity,
        };

        try {
            await update(userProfileRef, { location: locationData });
            // Update local user context (important!)
            if (updateUserLocation) {
                 updateUserLocation(locationData);
            } else {
                console.warn("updateUserLocation function not found in AuthContext");
                // Need to implement this in AuthContext to update the local state
                // For now, we might need to force a reload or handle differently
            }
            Alert.alert('Sucesso!', 'Sua localização foi salva.');
            // Navigate to Home or trigger a state update that re-evaluates navigation
            // This navigation might need adjustment based on how RootNavigator handles the check
            navigation.replace('Home'); // Replace to prevent going back
        } catch (error) {
            console.error('Erro ao salvar localização:', error);
            Alert.alert('Erro', 'Não foi possível salvar sua localização. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="location-outline" size={60} color={COLORS.primary} style={styles.icon} />
                <Text style={styles.title}>Onde você está?</Text>
                <Text style={styles.subtitle}>Selecione seu estado e cidade para ver as vibes da sua região.</Text>

                <Text style={styles.label}>Estado</Text>
                <RNPickerSelect
                    onValueChange={handleStateChange}
                    items={states}
                    placeholder={{ label: 'Selecione seu estado...', value: null }}
                    style={pickerSelectStyles}
                    value={selectedState}
                    useNativeAndroidPickerStyle={false} // Use custom styles on Android
                    Icon={() => {
                        return <Ionicons name="chevron-down" size={24} color="gray" />;
                    }}
                />

                <Text style={styles.label}>Cidade</Text>
                <RNPickerSelect
                    onValueChange={(value) => setSelectedCity(value)}
                    items={cities}
                    placeholder={{ label: 'Selecione sua cidade...', value: null }}
                    style={pickerSelectStyles}
                    value={selectedCity}
                    disabled={!selectedState} // Disable city until state is selected
                    useNativeAndroidPickerStyle={false}
                    Icon={() => {
                        return <Ionicons name="chevron-down" size={24} color="gray" />;
                    }}
                />

                <TouchableOpacity
                    style={[styles.button, (!selectedState || !selectedCity || isLoading) && styles.buttonDisabled]}
                    onPress={handleSaveLocation}
                    disabled={!selectedState || !selectedCity || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.buttonText} />
                    ) : (
                        <Text style={styles.buttonText}>Confirmar Localização</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    icon: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
    },
    label: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginLeft: 5,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#BDBDBD', // Gray out when disabled
        elevation: 0,
    },
    buttonText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        color: COLORS.buttonText,
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#DDE2E5',
        borderRadius: 10,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.surface,
        paddingRight: 30, // to ensure the text is never behind the icon
        marginBottom: 20,
    },
    inputAndroid: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#DDE2E5',
        borderRadius: 10,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.surface,
        paddingRight: 30, // to ensure the text is never behind the icon
        marginBottom: 20,
    },
    placeholder: {
        color: COLORS.textSecondary,
    },
    iconContainer: {
        top: 15,
        right: 15,
    },
});
