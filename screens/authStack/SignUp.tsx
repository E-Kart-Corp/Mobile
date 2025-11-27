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

const SignUp = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState("briceuh290@gmail.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignUp = async () => {
    try {
      if (password !== confirmPassword) {
        Alert.alert("Mot de passe différent")
      }
      await signOut(auth);
      const val = await createUserWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "client", val?.user?.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        Alert.alert("Erreur", "L'email existe déjà");
        return;
      }

      await setDoc(userRef, {
        email,
        created_at: new Date().toISOString(),
        current_kart: { idStore: "", kart: [] },
      });

      navigation.navigate("Login");
    } catch (error) {
      // Alert.alert("Erreur", error.message);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <BackGround middle={false} />
      <MyHeader />

      {/* CORRECTION LAYOUT : KeyboardAvoidingView pour l'accessibilité du bouton */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
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

          {/* Email Input */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Password Input */}
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Confirm Password Input - CORRIGÉ : utilise la variable confirmPassword */}
          <TextInput
            style={styles.input}
            placeholder="Confirmer mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={{ width: "100%", alignItems: "center" }}>
            <TouchableOpacity
              onPress={handleSignUp}
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
                marginBottom: 30, // Marge extra en bas
              }}
            >
              <Text style={{ color: "white" }}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = {
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
};

export default SignUp;
