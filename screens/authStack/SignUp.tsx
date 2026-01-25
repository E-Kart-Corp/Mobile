import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../config";
import { BackGround } from "../../component/background";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Image } from "react-native";
import MyHeader from "../../component/my_header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginScreenNavigationProp } from "./LoginScreen";
import { useAccessibility } from "../../accessibilityContext";

const SignUp = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { announce, triggerFeedback } = useAccessibility();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    try {
      if (password !== confirmPassword) {
        announce("Les deux mots de passe ne correspondent pas.");
        triggerFeedback("error");
        Alert.alert("Erreur", "Mot de passe différent");
        return;
      }
      await signOut(auth);
      const val = await createUserWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "client", val?.user?.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        announce("Un compte existe déjà avec cet email.");
        triggerFeedback("error");
        Alert.alert("Erreur", "L'email existe déjà");
        return;
      }

      await setDoc(userRef, {
        email,
        created_at: new Date().toISOString(),
        current_kart: { idStore: "", kart: [] },
      });

      announce("Compte créé. Vous pouvez vous connecter.");
      triggerFeedback("success");
      navigation.navigate("Login");
    } catch (error: any) {
      const msg = error?.message || "Une erreur est survenue.";
      announce("Erreur lors de l'inscription. " + msg);
      triggerFeedback("error");
      Alert.alert("Erreur", msg);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }} accessible={true} accessibilityLabel="Création de compte">
      <BackGround middle={false} />
      <MyHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          accessible={true}
          accessibilityLabel="Formulaire d'inscription"
        >
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
              style={{ top: 0, left: 0 }}
              source={require("./../../assets/logo_long.png")}
              accessible={false}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessible={true}
            accessibilityLabel="Champ email"
            accessibilityHint="Entrez votre adresse email"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessible={true}
              accessibilityLabel="Champ mot de passe"
              accessibilityHint="Choisissez un mot de passe"
            />
            <TouchableOpacity
              onPress={() => { triggerFeedback("selection"); setShowPassword((v) => !v); }}
              style={styles.eyeButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirmer mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              accessible={true}
              accessibilityLabel="Confirmer le mot de passe"
              accessibilityHint="Saisissez à nouveau le mot de passe"
            />
            <TouchableOpacity
              onPress={() => { triggerFeedback("selection"); setShowConfirmPassword((v) => !v); }}
              style={styles.eyeButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View style={{ width: "100%", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => { triggerFeedback("selection"); handleSignUp(); }}
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
                marginBottom: 30,
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="S'inscrire"
              accessibilityHint="Créer un compte avec les informations saisies"
            >
              <Text style={{ color: "white" }}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
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
  },
  passwordContainer: {
    width: "90%",
    alignSelf: "center",
    marginTop: 20,
  },
  passwordInput: {
    width: "100%",
    marginTop: 0,
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});

export default SignUp;
