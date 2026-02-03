export interface LongdoSearchResult {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

const LONGDO_SEARCH_API_URL = 'https://search.longdo.com/mapsearch/json/search';

export const longdoMapApi = {
    search: async (keyword: string, apiKey: string): Promise<LongdoSearchResult[]> => {
        try {
            if (!keyword.trim()) return [];

            const params = new URLSearchParams({
                keyword: keyword,
                limit: '20',
                key: apiKey
            });

            const url = `${LONGDO_SEARCH_API_URL}?${params.toString()}`;
            console.log("Fetching Longdo Search:", url);

            const response = await fetch(url);

            if (!response.ok) {
                console.error("Longdo API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();

            if (data && data.data) {
                return data.data.map((item: any, index: number) => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);

                    if (isNaN(lat) || isNaN(lon)) return null;

                    return {
                        id: item.id || `${index}`,
                        name: item.name || item.title || '',
                        address: item.address || '',
                        latitude: lat,
                        longitude: lon
                    };
                }).filter((item: any) => item !== null);
            }

            return [];
        } catch (error) {
            console.error("Failed to fetch Longdo search results:", error);
            return [];
        }
    }
};
