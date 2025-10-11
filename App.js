import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Octicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import screen yang sudah dibuat
import HomeScreen from "./pages/HomeScreen";
import ProfileScreen from "./pages/ProfileScreen";
import InventoryScreen from "./pages/InventoryScreen";
import TransactionScreen from "./pages/TransactionScreen";
import SalesReportScreen from "./pages/SalesReportScreen"; // BARU - Import SalesReportScreen
import Login from "./pages/Login";

const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

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
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  // Cek token di AsyncStorage saat pertama kali app dijalankan
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const user = await AsyncStorage.getItem("userData");

        if (token) {
          setUserToken(token);
          if (user) setUserData(JSON.parse(user));
        }
      } catch (error) {
        console.log("Error checking token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLogin();
  }, []);

  // Saat login sukses
  const handleLoginSuccess = (data) => {
    setUserToken(data.token);
    setUserData(data.user);
  };

  // Saat logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      setUserToken(null);
      setUserData(null);
    } catch (error) {
      console.log("Error during logout:", error);
    }
  };

  if (isLoading) {
    return null; // Bisa diganti splash screen atau ActivityIndicator
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
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
            
            {/* SalesReport Screen - Stack Screen untuk navigasi dari TransactionScreen */}
            <Stack.Screen 
              name="SalesReport" 
              component={SalesReportScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login">
            {(props) => (
              <Login {...props} onLoginSuccess={handleLoginSuccess} />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}