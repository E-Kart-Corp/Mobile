import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config";
import { BackGround } from "../../component/background";
import MyHeader from "../../component/my_header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccessibility } from "../../accessibilityContext";

const LostPassword = () => {
  const navigation = useNavigation();
  const { announce, triggerFeedback } = useAccessibility();
  const [email, setEmail] = useState("briceuh29@gmail.com");
  const insets = useSafeAreaInsets();

  const handleLostPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      announce("Email de réinitialisation envoyé. Vérifiez votre boîte de réception.");
      triggerFeedback("success");
      Alert.alert("Succès", "Un email de réinitialisation a été envoyé.");
    } catch (error: any) {
      announce("Erreur : " + (error.message || "impossible d'envoyer l'email"));
      triggerFeedback("error");
      Alert.alert("Erreur", error.message);
    }
  };

  return (
    <View style={{ flex: 1 }} accessible={true} accessibilityLabel="Récupération de mot de passe">
      <BackGround middle={false} />
      <MyHeader />

      <ScrollView accessible={true} accessibilityLabel="Formulaire de réinitialisation du mot de passe">
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
          accessibilityHint="Entrez votre adresse email pour réinitialiser votre mot de passe"
        />

        <View style={{ width: "100%", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => { triggerFeedback("selection"); handleLostPassword(); }}
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
            accessibilityLabel="Envoyer un code de réinitialisation"
            accessibilityHint="Appuyez pour recevoir un email de réinitialisation du mot de passe"
          >
            <Text style={{ color: "white" }}>Envoyer un code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default LostPassword;
