import React, { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { Ionicons } from "@expo/vector-icons";
import LoginScreen from "./screens/authStack/LoginScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LostPassword from "./screens/authStack/LostPassword";
import SignUp from "./screens/authStack/SignUp";
import CheckForm from "./screens/CheckForm";
import TicketsScreen from "./screens/TicketScreen";
import ProfileScreen from "./screens/ProfileScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import { AuthProvider } from "./authContext";
import { AccessibilityProvider } from "./accessibilityContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// const auth = getAuth(app);

const FEEDBACK_FORM_URL = "https://form.typeform.com/to/slfqQd2p";

export default function App() {
  const [initializing, setInitializing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      Alert.alert(
        "Votre avis compte",
        "Merci de nous aider à nous améliorer en répondant à ce questionnaire.",
        [
          { text: "Fermer", style: "cancel" },
          {
            text: "Remplir le formulaire",
            onPress: () => Linking.openURL(FEEDBACK_FORM_URL),
          },
        ]
      );
    }, 3 * 60 * 1000); // 3 minutes
  
    return () => clearTimeout(timeout);
  }, []);
  
  if (initializing) {
    return null;
  }

  return (
    <AuthProvider>
      <AccessibilityProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={user ? "TabStack" : "Login"}
          screenOptions={{
            headerShown: true,
            headerStyle: {},
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LostPassword"
            component={LostPassword}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CheckForm"
            component={CheckForm}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUp}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TabStack"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketsScreen"
            component={TicketsScreen}
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </AccessibilityProvider>
    </AuthProvider>
  );
}
