// __mocks__/react-native.js
// Mock React Native untuk testing environment

const ReactNative = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Image: 'Image',
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
};

module.exports = ReactNative;