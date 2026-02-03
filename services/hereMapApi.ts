import { Platform } from 'react-native';
import * as flexpolyline from '@here/flexpolyline';

const HERE_ROUTING_API_URL = 'https://router.hereapi.com/v8/routes';

export interface LatLng {
    latitude: number;
    longitude: number;
}

// Decode using official HERE flexpolyline library
function decode(encoded: string): LatLng[] {
    try {
        const decoded = flexpolyline.decode(encoded);
        const coordinates: LatLng[] = decoded.polyline.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng
        }));
        return coordinates;
    } catch (error) {
        console.error('Failed to decode polyline:', error);
        return [];
    }
}

export interface HereRouteSegment {
    coordinates: LatLng[];
    color: string;
}

export interface HereRoute {
    coordinates: LatLng[];
    segments: HereRouteSegment[];
    distance: number; // in meters
    duration: number; // in seconds
    summary: string;
}


export const hereMapApi = {
    // Simple route for just getting coordinates (e.g. for destination preview)
    getHereRoute: async (
        origin: LatLng,
        destination: LatLng,
        stops: LatLng[] = [],
        apiKey: string
    ): Promise<LatLng[]> => {
        try {
            const originStr = `${origin.latitude},${origin.longitude}`;
            const destStr = `${destination.latitude},${destination.longitude}`;

            let url = `${HERE_ROUTING_API_URL}?transportMode=car&origin=${originStr}&destination=${destStr}&return=polyline&apiKey=${apiKey}`;

            if (stops && stops.length > 0) {
                stops.forEach(stop => {
                    url += `&via=${stop.latitude},${stop.longitude}`;
                });
            }

            // console.log("Fetching HERE Route (Simple):", url);
            const response = await fetch(url);

            if (!response.ok) {
                console.error("HERE API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const sections = route.sections || [];
                let allCoordinates: LatLng[] = [];

                sections.forEach((section: any) => {
                    if (section && section.polyline) {
                        const sectionCoords = decode(section.polyline);
                        allCoordinates = [...allCoordinates, ...sectionCoords];
                    }
                });

                return allCoordinates;
            }

            return [];
        } catch (error) {
            console.error("Failed to fetch HERE route:", error);
            return [];
        }
    },

    // Get alternatives (complex object)
    getHereRouteAlternatives: async (
        origin: LatLng,
        destination: LatLng,
        apiKey: string,
        maxAlternatives: number = 3
    ): Promise<HereRoute[]> => {
        try {
            const originStr = `${origin.latitude},${origin.longitude}`;
            const destStr = `${destination.latitude},${destination.longitude}`;

            // Request alternatives from HERE API
            const url = `${HERE_ROUTING_API_URL}?transportMode=car&origin=${originStr}&destination=${destStr}&return=polyline,summary&alternatives=${maxAlternatives}&apiKey=${apiKey}`;

            // console.log("Fetching HERE Route Alternatives:", url);
            const response = await fetch(url);

            if (!response.ok) {
                console.error("HERE API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const routes = data.routes.map((route: any, index: number) => {
                    const section = route.sections[0];
                    const coordinates = section && section.polyline ? decode(section.polyline) : [];
                    const distance = section?.summary?.length || 0;
                    const duration = section?.summary?.duration || 0;

                    return {
                        coordinates,
                        segments: [], // No segments for alternatives to save perf
                        distance,
                        duration,
                        summary: `Route ${index + 1}`
                    };
                });
                return routes;
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch HERE route alternatives:", error);
            return [];
        }
    },

    // Main function for Home Screen with Traffic Segments
    getRoutes: async (
        origin: LatLng,
        destination: LatLng,
        stops: LatLng[] = [],
        mode: 'car' | 'truck' | 'scooter' | 'bicycle',
        apiKey: string
    ): Promise<HereRoute[]> => {
        try {
            const originStr = `${origin.latitude},${origin.longitude}`;
            const destStr = `${destination.latitude},${destination.longitude}`;

<<<<<<< HEAD
            // Construct via parameters for stops
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
            let viaParams = "";
            if (stops && stops.length > 0) {
                stops.forEach(stop => {
                    viaParams += `&via=${stop.latitude},${stop.longitude}`;
                });
            }

<<<<<<< HEAD
            // Request routes from HERE API with specific mode and traffic spans
            // Ensure spans=dynamicSpeedInfo,length is included!
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
            const url = `${HERE_ROUTING_API_URL}?transportMode=${mode}&origin=${originStr}&destination=${destStr}${viaParams}&return=polyline,summary&spans=dynamicSpeedInfo,length&apiKey=${apiKey}`;

            console.log("Fetching HERE Routes with Traffic:", url);
            const response = await fetch(url);

            if (!response.ok) {
                console.error("HERE API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const routes = data.routes.map((route: any, index: number) => {
                    const sections = route.sections || [];
                    let allCoordinates: LatLng[] = [];
                    const allSegments: HereRouteSegment[] = [];

                    let totalDistance = 0;
                    let totalDuration = 0;

                    sections.forEach((section: any, sectionIdx: number) => {
                        const sectionCoords = section && section.polyline ? decode(section.polyline) : [];
                        if (sectionCoords.length === 0) return;

                        const sectionStartIdx = allCoordinates.length;

<<<<<<< HEAD
                        // Avoid double points at waypoints (waypoints are last of section N and first of section N+1)
=======
                        // Avoid double points
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                        if (sectionIdx > 0 && allCoordinates.length > 0) {
                            allCoordinates = [...allCoordinates, ...sectionCoords.slice(1)];
                        } else {
                            allCoordinates = [...allCoordinates, ...sectionCoords];
                        }

                        totalDistance += section?.summary?.length || 0;
                        totalDuration += section?.summary?.duration || 0;

                        const spans = section?.spans || [];

                        if (spans.length > 0) {
                            for (let i = 0; i < spans.length; i++) {
                                const span = spans[i];
<<<<<<< HEAD
                                // Adjust index because we sliced the first point of subsequent sections
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                                const adjStartIdx = sectionIdx > 0 ? (sectionStartIdx - 1) : sectionStartIdx;

                                const startIdx = adjStartIdx + span.offset;
                                const endIdx = adjStartIdx + ((i < spans.length - 1) ? spans[i + 1].offset : sectionCoords.length - 1);

<<<<<<< HEAD
                                // Safety check for slice range
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                                if (startIdx >= endIdx) continue;

                                const segmentCoords = allCoordinates.slice(startIdx, endIdx + 1);
                                if (segmentCoords.length < 2) continue;

<<<<<<< HEAD
                                let color = '#4285F4'; // Default Blue
=======
                                let color = '#4285F4';
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                                if (span.dynamicSpeedInfo) {
                                    const base = span.dynamicSpeedInfo.baseSpeed || 0;
                                    const traffic = span.dynamicSpeedInfo.trafficSpeed || 0;
                                    const ratio = base > 0 ? traffic / base : 1;

<<<<<<< HEAD
                                    if (ratio < 0.50) color = '#ef4444'; // Red
                                    else if (ratio < 0.85) color = '#eab308'; // Yellow
=======
                                    if (ratio < 0.50) color = '#ef4444';
                                    else if (ratio < 0.85) color = '#eab308';
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                                }

                                allSegments.push({ coordinates: segmentCoords, color: color });
                            }
                        } else {
                            allSegments.push({ coordinates: sectionCoords, color: '#4285F4' });
                        }
                    });

<<<<<<< HEAD
                    // --- Optimization: Merge consecutive segments with the same color ---
=======
                    // Merge consecutive segments
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                    const mergedSegments: HereRouteSegment[] = [];
                    if (allSegments.length > 0) {
                        let current = allSegments[0];
                        for (let i = 1; i < allSegments.length; i++) {
                            const next = allSegments[i];
                            if (next.color === current.color) {
<<<<<<< HEAD
                                // Merge: Append next coordinates (skip first point as it should match last point)
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                                current.coordinates = [...current.coordinates, ...next.coordinates.slice(1)];
                            } else {
                                mergedSegments.push(current);
                                current = next;
                            }
                        }
                        mergedSegments.push(current);
                    }

<<<<<<< HEAD
                    // GAP FIX: Visual line from Origin to Start of Route
=======
                    // GAP FIX
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                    if (origin && !isNaN(origin.latitude) && !isNaN(origin.longitude) && allCoordinates.length > 0) {
                        mergedSegments.unshift({
                            coordinates: [origin, allCoordinates[0]],
                            color: '#4285F4'
                        });
                    }
<<<<<<< HEAD

                    // GAP FIX: Visual line from End to Destination
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                    if (destination && !isNaN(destination.latitude) && !isNaN(destination.longitude) && allCoordinates.length > 0) {
                        mergedSegments.push({
                            coordinates: [allCoordinates[allCoordinates.length - 1], destination],
                            color: '#4285F4'
                        });
                    }

<<<<<<< HEAD
                    // Final Safety: Remove any segments with invalid data
=======
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
                    const finalSegments = mergedSegments.filter(s =>
                        s.coordinates.length >= 2 &&
                        s.coordinates.every(p => !isNaN(p.latitude) && !isNaN(p.longitude))
                    );

                    return {
                        coordinates: allCoordinates.filter(p => !isNaN(p.latitude) && !isNaN(p.longitude)),
                        segments: finalSegments,
                        distance: totalDistance,
                        duration: totalDuration,
                        summary: `Route ${index + 1}`
                    };
                });
                return routes;
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch HERE routes:", error);
            return [];
        }
    }
};
