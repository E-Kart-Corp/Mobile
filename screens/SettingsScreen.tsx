import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { BackGround } from "../component/background";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSettings, IconAccount } from "../icon";
import { useNavigation } from "@react-navigation/native";
import { LoginScreenNavigationProp } from "./authStack/LoginScreen";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useAuth } from "../authContext";
import { useAccessibility } from "../accessibilityContext";

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }} accessible={true} accessibilityLabel="Écran des paramètres">
      <BackGround middle={true} />
      <ScrollView showsVerticalScrollIndicator={false} accessible={true} accessibilityLabel="Liste des paramètres de l'application">
        <View style={{ height: insets.top }} />
        <View
          style={{
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 50,
          }}
        >
          <IconSettings style={{ marginBottom: 20 }} accessible={false} />
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 30,
              color: "#333",
            }}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="Paramètres"
          >
            Paramètres
          </Text>
          <SettingsContent />
        </View>
      </ScrollView>
    </View>
  );
};

const SettingsContent = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { user, refreshUserData } = useAuth();
  const { theme, triggerFeedback, announce } = useAccessibility();
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    vibrations: true,
    colorBlindMode: false,
    highContrast: false,
    reduceMotion: false,
  });

  // Récupérer les paramètres depuis Firebase
  const fetchSettings = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, "client", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.settings) {
          setSettings({
            notifications: userData.settings.notifications ?? true,
            sounds: userData.settings.sounds ?? true,
            vibrations: userData.settings.vibrations ?? true,
            colorBlindMode: userData.settings.colorBlindMode ?? false,
            highContrast: userData.settings.highContrast ?? false,
            reduceMotion: userData.settings.reduceMotion ?? false,
          });
        }
      }
    } catch (error) {
      console.log("Erreur lors de la récupération des paramètres :", error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les paramètres dans Firebase
  const updateSettings = async (newSettings) => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, "client", user.uid);
      await updateDoc(docRef, {
        settings: newSettings,
        updatedAt: new Date().toISOString(),
      });
      setSettings(newSettings);
      refreshUserData();
    } catch (error) {
      console.log("Erreur MAJ settings :", error);
    }
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.log("Erreur lors de la déconnexion :", error);
            Alert.alert("Erreur", "Impossible de se déconnecter");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  if (loading) {
    return (
      <View style={{ alignItems: "center", width: "100%", marginTop: 50 }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View
      style={{ alignItems: "center", width: "100%", paddingHorizontal: 20 }}
    >
      {/* Section Notifications */}
      <View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]} accessible={true} accessibilityRole="header">
          Notifications
        </Text>
        <SettingItem
          theme={theme}
          title="Notifications push"
          description="Recevoir les notifications de l'application"
          value={settings.notifications}
          onValueChange={(value) => {
            const newSettings = { ...settings, notifications: value };
            updateSettings(newSettings);
          }}
          accessibilityLabel="Notifications push"
          accessibilityHint="Active ou désactive les notifications de l'application"
        />
      </View>

      {/* Section Audio & Vibrations — utiles pour les déficients auditifs (retour tactile) */}
      <View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]} accessible={true} accessibilityRole="header" accessibilityLabel="Audio et vibrations, retours sonores et tactiles">
          Audio & Vibrations
        </Text>
        <SettingItem
          theme={theme}
          title="Sons"
          description="Sons de confirmation (alternative auditive au retour visuel)"
          value={settings.sounds}
          onValueChange={(value) => {
            const newSettings = { ...settings, sounds: value };
            updateSettings(newSettings);
          }}
          accessibilityLabel="Sons"
          accessibilityHint="Active les sons de l'application pour les personnes malvoyantes"
        />
        <SettingItem
          theme={theme}
          title="Vibrations"
          description="Retour haptique (utile pour les déficients visuels et auditifs)"
          value={settings.vibrations}
          onValueChange={(value) => {
            const newSettings = { ...settings, vibrations: value };
            updateSettings(newSettings);
          }}
          accessibilityLabel="Vibrations"
          accessibilityHint="Active les vibrations pour un retour tactile"
        />
      </View>

      {/* Section Accessibilité */}
      <View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]} accessible={true} accessibilityRole="header" accessibilityLabel="Paramètres d'accessibilité">
          Accessibilité
        </Text>

        <SettingItem
          theme={theme}
          title="Mode daltonien"
          description="Adapter les couleurs pour les personnes daltoniennes"
          value={settings.colorBlindMode}
          onValueChange={(value) => {
            const newSettings = { ...settings, colorBlindMode: value };
            updateSettings(newSettings);
          }}
          accessibilityLabel="Mode daltonien"
          accessibilityHint="Active ou désactive l'adaptation des couleurs pour les personnes daltoniennes"
        />
        <SettingItem
          theme={theme}
          title="Contraste élevé"
          description="Renforce les contours et le contraste pour une meilleure lisibilité"
          value={settings.highContrast}
          onValueChange={(value) => {
            const newSettings = { ...settings, highContrast: value };
            updateSettings(newSettings);
          }}
          accessibilityLabel="Contraste élevé"
          accessibilityHint="Active un affichage à fort contraste pour les personnes malvoyantes"
        />
        <SettingItem
          theme={theme}
          title="Réduire les animations"
          description="Désactive ou réduit les animations pour les personnes sensibles au mouvement"
          value={settings.reduceMotion}
          onValueChange={(value) => {
            const newSettings = { ...settings, reduceMotion: value };
            updateSettings(newSettings);
          }}
          accessibilityLabel="Réduire les animations"
          accessibilityHint="Limite les animations pour plus de confort"
        />
      </View>

      {/* Section Aide */}
      <View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]} accessible={true} accessibilityRole="header">
          Aide
        </Text>
        <TouchableOpacity
          onPress={() => { triggerFeedback("selection"); navigation.navigate("Onboarding", { replay: true }); }}
          style={styles.helpItem}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Revoir le tutoriel"
          accessibilityHint="Ouvre le tutoriel de prise en main de l'application"
        >
          <Text style={[styles.settingTitle, { color: theme.text }]}>Revoir le tutoriel</Text>
          <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
            Revoir le guide de prise en main de l'application
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bouton Retour au profil */}
      <TouchableOpacity
        onPress={() => { triggerFeedback("selection"); navigation.goBack(); }}
        style={[styles.button, styles.profileButton, { backgroundColor: theme.primary || "#007bff" }]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Retour au profil"
        accessibilityHint="Retourne à l'écran de profil"
      >
        <IconAccount />
        <Text style={styles.profileButtonText}>Retour au profil</Text>
      </TouchableOpacity>

      {/* Bouton Déconnexion */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[styles.button, styles.logoutButton]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Se déconnecter"
        accessibilityHint="Fermer la session et revenir à l'écran de connexion"
      >
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
};

const SettingItem = ({ theme, title, description, value, onValueChange, accessibilityLabel, accessibilityHint }) => {
  const t = theme || { toggleActive: "#007bff", toggleInactive: "#ccc", text: "#333", textSecondary: "#666" };
  return (
    <View style={[styles.settingItem, { borderBottomColor: t.border || "#f0f0f0" }]}>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.settingDescription, { color: t.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.toggleInactive, true: t.toggleActive }}
        thumbColor={value ? "#fff" : "#f4f3f4"}
        accessible={true}
        accessibilityLabel={accessibilityLabel || `${title}, ${value ? "activé" : "désactivé"}`}
        accessibilityHint={accessibilityHint || description}
        accessibilityRole="switch"
      />
    </View>
  );
};

const styles = {
  sectionContainer: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: {
      height: 2,
      width: 0,
    },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  helpItem: {
    paddingVertical: 15,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    flexDirection: "row",
  },
  profileButton: {
    backgroundColor: "#007bff",
    marginTop: 20,
  },
  profileButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    marginBottom: 30,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
};

export default SettingsScreen;
