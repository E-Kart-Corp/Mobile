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
  const [password, setPassword] = useState("Password");

  const handleSignUp = async () => {
    try {
      await signOut(auth);
      const val = await createUserWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "client", val?.user?.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        Alert.alert("Erreur", "L'email existe déjà");
        return;
      }

      const newUser = {
        email,
        created_at: new Date().toISOString(),
        current_kart: {
          idStore: "",
          kart: [],
        },
      };

      await setDoc(userRef, newUser);
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Erreur", error.message);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <BackGround middle={false} />
      <MyHeader />
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
          accessible={true}
          accessibilityLabel="Champ email"
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
          accessible={true}
          accessibilityLabel="Champ mot de passe"
          accessibilityHint="Entrez votre mot de passe"
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
          accessible={true}
          accessibilityLabel="Champ confirmation mot de passe"
          accessibilityHint="Répétez votre mot de passe"
        />
        <View style={{ width: "100%", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => {
              handleSignUp();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="S'inscrire"
            accessibilityHint="Appuyez pour créer votre compte"
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
            <Text style={{ color: "white" }}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SignUp;
