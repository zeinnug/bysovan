import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Octicons } from "@expo/vector-icons";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

// Import Auth Service
import { 
  isAuthenticated, 
  getLocalUserData, 
  getUserRole,
  logoutUser 
} from "./login auth/authService";

// Import Auth Screens
import Login from "./pages/Login.js";
import ForgotPassword from "./pages/ForgotPassword.js";
import ChangePassword from "./pages/ChangePassword.js";
import EmailVerification from "./pages/EmailVerification.js";

// Import Main App Screens
import HomeScreen from "./pages/HomeScreen.js";
import ProfileScreen from "./pages/ProfileScreen.js";
import InventoryScreen from "./pages/InventoryScreen.js";
import TransactionScreen from "./pages/TransactionScreen.js";
import SalesReportScreen from "./pages/SalesReportScreen.js";
import NewTransactionScreen from "./pages/NewTransactionScreen.js";

const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

// ====== LOADING SCREEN ======
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoCircle}>
        <Octicons name="package" size={48} color="#FFFFFF" />
      </View>
      <Text style={styles.brandName}>SepatuBySovan</Text>
      <ActivityIndicator size="large" color="#FC6A0A" style={styles.loader} />
      <Text style={styles.loadingText}>Memuat aplikasi...</Text>
    </View>
  );
}

// ====== BOTTOM TAB (Main App setelah login) ======
function MainTabs({ userData, onLogout }) {
  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#FC6A0A",
        tabBarInactiveTintColor: "#585757",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarStyle: {
          position: "absolute",
          display: "flex",
          alignItems: "center",
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: "#585757",
          marginHorizontal: 16,
          borderRadius: 24,
          height: 70,
          marginBottom: 16,
          paddingBottom: 8,
          paddingTop: 8,
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        },
        tabBarIcon: ({ color }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Inventory") {
            iconName = "package";
          } else if (route.name === "Transaksi") {
            iconName = "credit-card";
          } else if (route.name === "Profile") {
            iconName = "person";
          }
          return <Octicons name={iconName} size={24} color={color} />;
        },
        headerShown: false,
      })}
    >
      <BottomTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Beranda" }}
      />
      <BottomTab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ tabBarLabel: "Inventory" }}
      />
      <BottomTab.Screen
        name="Transaksi"
        component={TransactionScreen}
        options={{ tabBarLabel: "Transaksi" }}
      />
      <BottomTab.Screen name="Profile">
        {(props) => (
          <ProfileScreen
            {...props}
            userData={userData}
            onLogout={onLogout}
          />
        )}
      </BottomTab.Screen>
    </BottomTab.Navigator>
  );
}

// ====== APP.JS ======
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);
  const [userData, setUserData] = useState(null);

  // Cek status autentikasi saat app pertama kali dijalankan
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Cek apakah user sudah login
      const isLoggedIn = await isAuthenticated();
      
      if (isLoggedIn) {
        // Ambil data user dari local storage
        const user = await getLocalUserData();
        const role = await getUserRole();
        
        if (user) {
          setUserData({ ...user, role });
          setIsAuthenticatedState(true);
        } else {
          setIsAuthenticatedState(false);
        }
      } else {
        setIsAuthenticatedState(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticatedState(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login sukses
  const handleLoginSuccess = async (data) => {
    try {
      setIsAuthenticatedState(true);
      setUserData(data.user);
    } catch (error) {
      console.error("Error handling login success:", error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser(); // Ini akan clear AsyncStorage & logout dari server
      setIsAuthenticatedState(false);
      setUserData(null);
    } catch (error) {
      console.error("Error during logout:", error);
      // Tetap logout meskipun ada error
      setIsAuthenticatedState(false);
      setUserData(null);
    }
  };

  // Handle email verification success
  const handleVerificationSuccess = () => {
    // Update user data setelah verifikasi
    if (userData) {
      setUserData({
        ...userData,
        email_verified_at: new Date().toISOString()
      });
    }
  };

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticatedState ? (
          // ===== AUTHENTICATED ROUTES =====
          <>
            {/* Main App dengan Bottom Tab */}
            <Stack.Screen name="MainApp">
              {(props) => (
                <MainTabs
                  {...props}
                  userData={userData}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            
            {/* SalesReport Screen */}
            <Stack.Screen 
              name="SalesReport" 
              component={SalesReportScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />

            {/* NewTransaction Screen */}
            <Stack.Screen
              name="NewTransaction"
              component={NewTransactionScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />

            {/* Change Password Screen */}
            <Stack.Screen
              name="ChangePassword"
              component={ChangePassword}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />

            {/* Email Verification Screen */}
            <Stack.Screen name="EmailVerification">
              {(props) => (
                <EmailVerification
                  {...props}
                  onVerificationSuccess={handleVerificationSuccess}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          // ===== GUEST ROUTES (Not Authenticated) =====
          <>
            {/* Login Screen */}
            <Stack.Screen name="Login">
              {(props) => (
                <Login 
                  {...props} 
                  onLoginSuccess={handleLoginSuccess} 
                />
              )}
            </Stack.Screen>

            {/* Forgot Password Screen */}
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPassword}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ====== STYLES ======
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5ECE4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FC6A0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 32,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#585757',
  },
});