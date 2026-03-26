
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const WEB_MOCKS = {
  'react-native-maps': 'react-native-maps.js',
  'expo-location': 'expo-location.js',
  'expo-image-picker': 'expo-image-picker.js',
  '@react-native-google-signin/google-signin': 'google-signin.js',
  '@react-native-async-storage/async-storage': 'async-storage.js',
};

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const mock = WEB_MOCKS[moduleName];
    if (mock) {
      return {
        filePath: path.resolve(__dirname, 'web-mocks', mock),
        type: 'sourceFile',
      };
    }
  }
  if (originalResolver) return originalResolver(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
