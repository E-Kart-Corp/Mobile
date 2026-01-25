import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { signInWithEmailAndPassword } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../config";
import { BackGround } from "../../component/background";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ONBOARDING_STORAGE_KEY } from "../../storageKeys";
import { useAccessibility } from "../../accessibilityContext";
import { StackNavigationProp } from "@react-navigation/stack";

type AuthStackParamList = {
  TabStack: undefined;
  Onboarding: { replay?: boolean };
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
  const { announce, triggerFeedback } = useAccessibility();
  const [email, setEmail] = useState("briceuh290@gmail.com");
  const [password, setPassword] = useState("Password");
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      announce("Connexion réussie");
      triggerFeedback("success");
      const hasCompletedOnboarding =
        (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === "false";
      navigation.reset({
        index: 0,
        routes: [
          { name: hasCompletedOnboarding ? "TabStack" : "Onboarding" },
        ],
      });
    } catch (error: any) {
      console.log("Firebase login error:", error);
      let msg = "Une erreur est survenue.";
      switch (error.code) {
        case "auth/invalid-email":
          msg = "Adresse email invalide.";
          break;
        case "auth/user-not-found":
          msg = "Aucun utilisateur trouvé avec cet email.";
          break;
        case "auth/wrong-password":
          msg = "Mot de passe incorrect.";
          break;
        case "auth/invalid-credential":
          msg = "Email ou mot de passe invalide.";
          break;
        default:
          msg = error.message || msg;
      }
      announce("Erreur de connexion. " + msg);
      triggerFeedback("error");
      Alert.alert("Erreur", msg);
    }
  };

  return (
    <View style={{ flex: 1 }} accessible={true} accessibilityLabel="Écran de connexion">
      <BackGround middle={false} />
      <ScrollView accessible={true} accessibilityLabel="Formulaire de connexion">
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
            source={require("./../../assets/logo_long.png")}
            style={{ top: 0, left: 0 }}
            accessible={false}
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
            shadowOffset: { height: 0, width: 0 },
          }}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          accessible={true}
          accessibilityLabel="Champ de saisie email"
          accessibilityHint="Entrez votre adresse email"
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
            shadowOffset: { height: 0, width: 0 },
          }}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          accessible={true}
          accessibilityLabel="Champ de saisie mot de passe"
          accessibilityHint="Entrez votre mot de passe"
        />

        <TouchableOpacity
          onPress={() => { triggerFeedback("selection"); navigation.navigate("LostPassword"); }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Mot de passe oublié"
          accessibilityHint="Navigue vers l'écran de récupération du mot de passe"
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
            onPress={() => { triggerFeedback("selection"); handleLogin(); }}
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
              shadowOffset: { height: 0, width: 0 },
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Se connecter"
            accessibilityHint="Se connecter avec vos identifiants"
          >
            <Text style={{ color: "white" }}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* <TouchableOpacity
        onPress={() => navigation.navigate("CheckForm")}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Version Test Forme"
        accessibilityHint="Navigue vers la version test"
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
      </TouchableOpacity> */}

      <TouchableOpacity
        onPress={() => { triggerFeedback("selection"); navigation.navigate("SignUp"); }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="S'inscrire"
        accessibilityHint="Navigue vers l'écran de création de compte"
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
    </View>
  );
};

export default LoginScreen;
