import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { cn } from '../../utils/cn';

interface AppInputProps extends React.ComponentProps<typeof TextInput> {
    label?: string;
    error?: string;
    containerClassName?: string;
    inputContainerClassName?: string;
    icon?: React.ReactNode;
}

export const AppInput = ({
    label,
    error,
    containerClassName,
    inputContainerClassName,
    className,
    icon,
    ...props
}: AppInputProps) => {
    return (
        <View className={cn("w-full mb-4", containerClassName)}>
            {label && <Text className="text-gray-700 font-medium mb-1.5">{label}</Text>}
            <View className={cn(
                "flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50 focus:border-green-500 focus:bg-white transition-colors h-12",
                inputContainerClassName
            )}>
                {icon && <View className="mr-2">{icon}</View>}
                <TextInput
                    className={cn("flex-1 text-gray-800 text-base h-full", className)}
                    placeholderTextColor="#9CA3AF"
                    {...props}
                />
            </View>
            {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
        </View>
    );
};
