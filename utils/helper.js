const MAPS_URL = 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced';
const LOCAL_FINDER_URL = 'https://api.dataforseo.com/v3/serp/google/local_finder/live/advanced';

const metersToDegrees = async (lat, meters) => {
    const earthRadius = 6378137; // in meters
    const dLat = meters / earthRadius;
    const dLng = meters / (earthRadius * Math.cos((Math.PI * lat) / 180));
    return {
        dLat: dLat * (180 / Math.PI),
        dLng: dLng * (180 / Math.PI)
    }
}
const generateGrid = async ({ centerLat, centerLng, gridSize, stepMeters, searchRadiusMeters = 800 }) => {
    const half = Math.floor(gridSize / 2);
    const { dLat, dLng } = await metersToDegrees(centerLat, stepMeters);
    const cells = [];
    for (let i = -half; i <= half; i++) {
        for (let j = -half; j <= half; j++) {
            const lat = centerLat + i * dLat;
            const lng = centerLng + j * dLng;
            const gps = `${lat.toFixed(6)},${lng.toFixed(6)},${searchRadiusMeters}`;
            const cellId = `cell-${i}-${j}`;
            cells.push({
                i,
                j,
                lat,
                lng,
                gps_coordinates: gps,
                cellId,
                tag: cellId
            });
        }
    }
    return cells;
}
const getAuthHeader = () => {
    const { DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD } = process.env;
    if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) throw new Error('Missing DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD');
    const token = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`, 'utf8').toString('base64');
    return 'Basic ' + token;
}
const postTasks = async ({ type, tasks, timeout = 20000 }) => {
    const url = type === 'maps' ? MAPS_URL : LOCAL_FINDER_URL;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(tasks),
            signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Upstream ${res.status}: ${text}`);
        return JSON.parse(text);
    } finally {
        clearTimeout(id);
    }
}
module.exports = {
    metersToDegrees,
    generateGrid,
    postTasks
}