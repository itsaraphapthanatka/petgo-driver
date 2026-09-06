export default ({ config }) => {
    // เตือนตั้งแต่ตอน build ถ้าลืมใส่ key ใน .env แทนที่จะไปเจอแผนที่พื้นเทาแล้วงมหาสาเหตุ
    if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
        console.warn('[app.config.js] ไม่พบ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ใน .env — แผนที่จะไม่แสดง');
    }

    return ({
    ...config,
    ios: {
        ...config.ios,
        bundleIdentifier: config.ios?.bundleIdentifier || "com.petgo.petgo",
        config: {
            ...config.ios?.config,
            googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || config.ios?.config?.googleMapsApiKey,
        },
    },
    android: {
        ...config.android,
        package: config.android?.package || "com.petgo.petgo",
        config: {
            ...config.android?.config,
            googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || config.android?.config?.googleMaps?.apiKey,
            },
        },
    },

    extra: {
        ...(config.extra ?? {}),
        eas: {
            projectId: "fe18173f-c822-4d80-9c28-c1132877d6e7",
        },
    },
    });
};
