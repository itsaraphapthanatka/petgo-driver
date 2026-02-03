import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppButton } from '../../../components/ui/AppButton';
import { ArrowLeft, Plus, Check, User, Users, Info, X } from 'lucide-react-native';
import { petService, Pet, PetType } from '../../../services/petService';

export default function SelectPetScreen() {
    const { t } = useTranslation();
    const [pets, setPets] = useState<Pet[]>([]);
    const [petTypes, setPetTypes] = useState<PetType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPets, setSelectedPets] = useState<string[]>([]);
    const [passengerCount, setPassengerCount] = useState<number>(1); // 1 = Alone, 2 = 2+ people

    const [isAddingPet, setIsAddingPet] = useState(false);
    const [addingInProgress, setAddingInProgress] = useState(false);
    const [newPetName, setNewPetName] = useState('');
    const [newPetType, setNewPetType] = useState('Dog');
    const [newPetBreed, setNewPetBreed] = useState('');
    const [newPetWeight, setNewPetWeight] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fetchedPets, fetchedTypes] = await Promise.all([
                    petService.getPets(),
                    petService.getPetTypes()
                ]);
                setPets(fetchedPets);
                setPetTypes(fetchedTypes);
            } catch (error) {
                console.error('Error fetching pet data:', error);
                Alert.alert(t('error'), 'Failed to load pet data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePetToggle = (petId: string) => {
        setSelectedPets(prev => {
            if (prev.includes(petId)) {
                return prev.filter(id => id !== petId);
            } else {
                // Rule: Alone (2 pets), Group (1 pet)
                const maxPets = passengerCount === 1 ? 2 : 1;
                if (prev.length >= maxPets) {
                    Alert.alert(
                        t('limit_reached'),
                        passengerCount === 1
                            ? t('alone_limit_desc')
                            : t('group_limit_desc')
                    );
                    return prev;
                }
                return [...prev, petId];
            }
        });
    };

    const handleAddPet = async () => {
        if (!newPetName || !newPetWeight) {
            Alert.alert(t('error'), 'Please fill in all fields');
            return;
        }

        setAddingInProgress(true);
        try {
            const newPet = await petService.createPet({
                name: newPetName,
                type: newPetType,
                breed: newPetBreed,
                weight: Number(newPetWeight) || 0,
            });
            setPets(prev => [...prev, newPet]);
            setIsAddingPet(false);
            setNewPetName('');
            setNewPetBreed('');
            setNewPetWeight('');
        } catch (error) {
            console.error('Error adding pet:', error);
            Alert.alert(t('error'), 'Failed to add pet');
        } finally {
            setAddingInProgress(false);
        }
    };
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-2 flex-1">
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold">{t('select_passenger')}</Text>
                </View>

                <Text className="text-gray-500 mb-4">{t('how_many_people')}</Text>

                <View className="flex-row mb-6 gap-4">
                    <TouchableOpacity
                        onPress={() => {
                            setPassengerCount(1);
                            setSelectedPets([]); // Reset on change
                        }}
                        className={`flex-1 p-4 rounded-xl border-2 items-center ${passengerCount === 1 ? 'border-primary bg-green-50' : 'border-gray-100 bg-white'}`}
                    >
                        <User size={24} color={passengerCount === 1 ? '#00A862' : 'gray'} />
                        <Text className={`font-semibold mt-2 ${passengerCount === 1 ? 'text-primary' : 'text-gray-500'}`}>{t('travel_alone')}</Text>
                        <Text className="text-xs text-gray-400 text-center">{t('max_2_pets')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setPassengerCount(2);
                            setSelectedPets([]); // Reset on change
                        }}
                        className={`flex-1 p-4 rounded-xl border-2 items-center ${passengerCount >= 2 ? 'border-primary bg-green-50' : 'border-gray-100 bg-white'}`}
                    >
                        <Users size={24} color={passengerCount >= 2 ? '#00A862' : 'gray'} />
                        <Text className={`font-semibold mt-2 ${passengerCount >= 2 ? 'text-primary' : 'text-gray-500'}`}>{t('travel_group')}</Text>
                        <Text className="text-xs text-gray-400 text-center">{t('max_1_pet')}</Text>
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 mb-4">{t('select_pets')}</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {pets.map((pet) => {
                        const isSelected = selectedPets.includes(pet.id);
                        return (
                            <TouchableOpacity
                                key={pet.id}
                                onPress={() => handlePetToggle(pet.id)}
                                className={`p-4 rounded-xl border-2 mb-4 flex-row items-center ${isSelected ? 'border-primary bg-green-50' : 'border-gray-100 bg-white'}`}
                            >
                                <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-4">
                                    <Text className="text-2xl">{pet.image}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-lg text-gray-800">{pet.name}</Text>
                                    <Text className="text-gray-500 text-sm">{pet.type}{pet.breed ? ` (${pet.breed})` : ''} • {pet.weight} kg</Text>
                                </View>
                                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                    {isSelected && <Check size={14} color="white" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {!isAddingPet ? (
                        <TouchableOpacity
                            onPress={() => setIsAddingPet(true)}
                            className="flex-row items-center justify-center p-4 border border-dashed border-gray-300 rounded-xl mt-2 mb-4"
                        >
                            <Plus size={20} color="gray" className="mr-2" />
                            <Text className="text-gray-500 font-semibold">{t('add_new_pet')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="p-4 border border-gray-200 rounded-xl mt-2 mb-4 bg-gray-50">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="font-bold text-gray-800">{t('new_pet_details')}</Text>
                                <TouchableOpacity onPress={() => setIsAddingPet(false)}>
                                    <X size={20} color="gray" />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                placeholder={t('pet_name')}
                                value={newPetName}
                                onChangeText={setNewPetName}
                                className="bg-white p-3 rounded-lg border border-gray-200 mb-3"
                            />

                            <TextInput
                                placeholder={t('breed')}
                                value={newPetBreed}
                                onChangeText={setNewPetBreed}
                                className="bg-white p-3 rounded-lg border border-gray-200 mb-3"
                            />

                            <View className="flex-row gap-2 mb-3">
                                {petTypes.map(type => (
                                    <TouchableOpacity
                                        key={type.id}
                                        onPress={() => setNewPetType(type.name)}
                                        className={`flex-1 p-2 rounded-lg border items-center ${newPetType === type.name ? 'border-primary bg-green-50' : 'border-gray-200 bg-white'}`}
                                    >
                                        <Text className={newPetType === type.name ? 'text-primary font-semibold' : 'text-gray-500'}>{type.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                {petTypes.length === 0 && ['Dog', 'Cat', 'Other'].map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setNewPetType(type)}
                                        className={`flex-1 p-2 rounded-lg border items-center ${newPetType === type ? 'border-primary bg-green-50' : 'border-gray-200 bg-white'}`}
                                    >
                                        <Text className={newPetType === type ? 'text-primary font-semibold' : 'text-gray-500'}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                placeholder={t('weight_kg')}
                                value={newPetWeight}
                                onChangeText={setNewPetWeight}
                                keyboardType="numeric"
                                className="bg-white p-3 rounded-lg border border-gray-200 mb-4"
                            />

                            <TouchableOpacity
                                onPress={handleAddPet}
                                disabled={addingInProgress}
                                className={`bg-primary p-3 rounded-lg items-center ${addingInProgress ? 'opacity-50' : ''}`}
                            >
                                <Text className="text-white font-bold">{addingInProgress ? '...' : t('add_pet')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="bg-blue-50 p-4 rounded-xl flex-row items-start mt-2 mb-6">
                        <Info size={20} color="#3B82F6" className="mr-3 mt-1" />
                        <View className="flex-1">
                            <Text className="text-blue-800 font-semibold mb-1">{t('travel_tips_title')}</Text>
                            <Text className="text-blue-600 text-sm leading-5">
                                {t('travel_tips_desc')}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>

            <View className="p-5 border-t border-gray-100">
                <AppButton
                    title={t('next')}
                    disabled={selectedPets.length === 0}
                    onPress={() => {
                        const selectedPetsData = pets.filter(p => selectedPets.includes(p.id));
                        const totalWeight = selectedPetsData.reduce((sum, p) => sum + p.weight, 0);
                        const petNames = selectedPetsData.map(p => p.name).join(', ');

                        router.push({
                            pathname: '/(customer)/booking/confirm',
                            params: {
                                petIds: selectedPets.join(','),
                                petNames: petNames, // Pass all pet names
                                petType: selectedPetsData[0].type, // Primary pet type
                                petWeight: totalWeight,
                                passengers: passengerCount // Pass passenger count
                            }
                        });
                    }}
                />
            </View>
        </SafeAreaView>
    );
}
