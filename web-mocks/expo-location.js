
export const Accuracy = { Balanced: 3, High: 4, Highest: 6, Low: 1, Lowest: 0, BestForNavigation: 5 };
export const requestForegroundPermissionsAsync = async () => ({ status: 'granted' });
export const requestBackgroundPermissionsAsync = async () => ({ status: 'denied' });
export const getCurrentPositionAsync = async () => ({ coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 10 } });
export const watchPositionAsync = () => ({ remove: () => {} });
export const geocodeAsync = async () => [];
export const reverseGeocodeAsync = async () => [];
export const hasServicesEnabledAsync = async () => true;
export const enableNetworkProviderAsync = async () => {};
export default { Accuracy, requestForegroundPermissionsAsync, getCurrentPositionAsync, watchPositionAsync, geocodeAsync, reverseGeocodeAsync };
