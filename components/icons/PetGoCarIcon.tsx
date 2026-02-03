import React from 'react';
import Svg, { Path, Ellipse, G, Defs, ClipPath, Rect, LinearGradient, Stop } from 'react-native-svg';

interface CarIconProps {
    width?: number;
    height?: number;
}

export const PetGoCarIcon: React.FC<CarIconProps> = ({ width = 48, height = 48 }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 100 200" fill="none">
            {/* Simple Shadow */}
            <Ellipse cx="50" cy="110" rx="40" ry="100" fill="black" fillOpacity={0.15} />

            {/* Main Body */}
            <Rect x="10" y="10" width="80" height="180" rx="40" fill="url(#body_grad)" />

            {/* Windshield */}
            <Path
                d="M25 60C25 45 40 40 50 40C60 40 75 45 75 60L72 85H28L25 60Z"
                fill="url(#glass_grad)"
            />

            {/* Rear Window */}
            <Path
                d="M28 140H72L75 160C75 175 60 180 50 180C40 180 25 175 25 160L28 140Z"
                fill="url(#glass_grad)"
            />

            {/* Roof */}
            <Rect x="28" y="80" width="44" height="65" rx="5" fill="#334155" />

            {/* Headlights */}
            <Rect x="18" y="30" width="12" height="6" rx="3" fill="#F1F5F9" fillOpacity={0.8} />
            <Rect x="70" y="30" width="12" height="6" rx="3" fill="#F1F5F9" fillOpacity={0.8} />

            {/* Tail lights */}
            <Rect x="18" y="175" width="12" height="4" rx="2" fill="#EF4444" />
            <Rect x="70" y="175" width="12" height="4" rx="2" fill="#EF4444" />

            <Defs>
                <LinearGradient id="body_grad" x1="50" y1="10" x2="50" y2="190" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#475569" />
                    <Stop offset="0.5" stopColor="#1E293B" />
                    <Stop offset="1" stopColor="#0F172A" />
                </LinearGradient>
                <LinearGradient id="glass_grad" x1="50" y1="40" x2="50" y2="180" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#94A3B8" stopOpacity={0.6} />
                    <Stop offset="1" stopColor="#475569" stopOpacity={0.8} />
                </LinearGradient>
            </Defs>
        </Svg>
    );
};
