import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config";
import { BackGround } from "../../component/background";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackNavigationProp } from "@react-navigation/stack";

type AuthStackParamList = {
  TabStack: undefined;
  LostPassword: undefined;
  CheckForm: undefined;
  SignUp: undefined;
  Login: undefined;
  Settings: undefined;
  TicketsScreen: undefined;
  Profile: undefined;
};

export type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState("briceuh290@gmail.com");
  const [password, setPassword] = useState("Password");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.reset({
        index: 0,
        routes: [{ name: "TabStack" }],
      });
    } catch (error: any) {
      console.log("Firebase login error:", {
        code: error.code,
        message: error.message,
        name: error.name,
      });

      switch (error.code) {
        case "auth/invalid-email":
          Alert.alert("Erreur", "Adresse email invalide.");
          break;
        case "auth/user-not-found":
          Alert.alert("Erreur", "Aucun utilisateur trouvé avec cet email.");
          break;
        case "auth/wrong-password":
          Alert.alert("Erreur", "Mot de passe incorrect.");
          break;
        case "auth/invalid-credential":
          Alert.alert("Erreur", "Email ou mot de passe invalide.");
          break;
        default:
          Alert.alert("Erreur", error.message || "Une erreur est survenue.");
      }
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <BackGround middle={false} />
      {/* <SafeAreaView style={{ flex: 1 }}> */}
      <ScrollView>
        <View style={{ height: insets.top }} />
        <View
          style={{
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 80,
          }}
        >
          <Image
            style={{
              top: 0,
              left: 0,
            }}
            source={require("./../../assets/logo_long.png")}
          />
        </View>
        <TextInput
          style={{
            width: "90%",
            backgroundColor: "white",
            alignSelf: "center",
            marginTop: 20,
            paddingHorizontal: 16,
            paddingVertical: 17,
            borderRadius: 18,
            shadowOpacity: 0.5,
            shadowRadius: 3,
            shadowOffset: {
              height: 0,
              width: 0,
            },
          }}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={{
            width: "90%",
            backgroundColor: "white",
            alignSelf: "center",
            marginTop: 20,
            paddingHorizontal: 16,
            paddingVertical: 17,
            borderRadius: 18,
            marginBottom: 16,
            shadowOpacity: 0.5,
            shadowRadius: 3,
            shadowOffset: {
              height: 0,
              width: 0,
            },
          }}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => {
            navigation.navigate("LostPassword");
          }}
        >
          <Text
            style={{
              width: "90%",
              alignSelf: "center",
              textAlign: "right",
            }}
          >
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>
        <View style={{ width: "100%", alignItems: "center" }}>
          <TouchableOpacity
            onPress={handleLogin}
            style={{
              padding: 12,
              marginTop: 20,
              width: 175,
              height: 45,
              backgroundColor: "#007A5E",
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              shadowOpacity: 0.5,
              shadowRadius: 3,
              shadowColor: "rgba(0,122,84, 1)",
              shadowOffset: {
                height: 0,
                width: 0,
              },
            }}
          >
            <Text style={{ color: "white" }}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => {
          navigation.navigate("CheckForm");
        }}
      >
        <Text
          style={{
            alignSelf: "center",
            bottom: 40,
            position: "absolute",
            textDecorationLine: "underline",
          }}
        >
          Version Test Forme
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          navigation.navigate("SignUp");
        }}
      >
        <Text
          style={{
            alignSelf: "center",
            bottom: 20,
            position: "absolute",
            color: "white",
            textDecorationLine: "underline",
          }}
        >
          S'inscrire ?
        </Text>
      </TouchableOpacity>
      {/* </SafeAreaView> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});

export default LoginScreen;
