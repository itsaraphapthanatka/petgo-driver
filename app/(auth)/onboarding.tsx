import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';

const { width } = Dimensions.get('window');



export default function OnboardingScreen() {
    const { t, i18n } = useTranslation();
    const [slideIndex, setSlideIndex] = useState(0);

    const SLIDES = [
        {
            id: 1,
            title: t('onboarding.slide1_title'),
            subtitle: t('onboarding.slide1_subtitle'),
            color: "bg-green-50"
        },
        {
            id: 2,
            title: t('onboarding.slide2_title'),
            subtitle: t('onboarding.slide2_subtitle'),
            color: "bg-blue-50"
        },
        {
            id: 3,
            title: t('onboarding.slide3_title'),
            subtitle: t('onboarding.slide3_subtitle'),
            color: "bg-purple-50"
        }
    ];

    const toggleLanguage = () => {
        const currentLang = i18n.language;
        const nextLanguage = currentLang === 'th' || currentLang.startsWith('th') ? 'en' : 'th';
        i18n.changeLanguage(nextLanguage);
    };

    const handleNext = () => {
        if (slideIndex < SLIDES.length - 1) {
            setSlideIndex(prev => prev + 1);
        } else {
            router.replace('/(auth)/login');
        }
    };

    return (
        <SafeAreaView className={`flex-1 ${SLIDES[slideIndex].color} justify-between pb-8`}>
            <View className="flex-row justify-between items-center p-6">
                <TouchableOpacity
                    onPress={toggleLanguage}
                    className="bg-white px-3 py-1.5 rounded-full shadow-sm"
                >
                    <Text className="font-bold text-gray-800 text-sm">
                        {(i18n.language || 'en').startsWith('en') ? '🇹🇭 TH' : '🇬🇧 EN'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                    <Text className="text-gray-500 font-semibold">{t('onboarding.skip')}</Text>
                </TouchableOpacity>
            </View>


            <View className="items-center px-6">
                <View className="w-64 h-64 bg-white/50 rounded-full mb-10 items-center justify-center">
                    {/* Illustration Placeholder */}
                    <Text className="text-4xl">🐶🐱</Text>
                </View>
                <Text className="text-3xl font-bold text-center text-gray-800 mb-4">{SLIDES[slideIndex].title}</Text>
                <Text className="text-gray-500 text-center text-lg leading-6">{SLIDES[slideIndex].subtitle}</Text>
            </View>

            <View className="px-6 w-full">
                {/* Indicators */}
                <View className="flex-row justify-center mb-8 space-x-2">
                    {SLIDES.map((_, i) => (
                        <View key={i} className={`h-2 rounded-full transition-all ${i === slideIndex ? 'w-8 bg-primary' : 'w-2 bg-gray-300'}`} />
                    ))}
                </View>

                <AppButton title={slideIndex === 2 ? t('onboarding.get_started') : t('onboarding.next')} onPress={handleNext} />
            </View>
        </SafeAreaView>
    );
}
