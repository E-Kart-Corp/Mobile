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

const getColorBlindTheme = (isColorBlindMode) => {
  if (isColorBlindMode) {
    return {
      text: '#000000',
      textSecondary: '#4A4A4A',
      background: '#F8F9FA',
      cardBackground: '#FFFFFF',
      border: '#000000',
      toggleActive: '#FFD700',
      toggleInactive: '#CCCCCC',
    };
  } else {
    return {
      text: '#333333',
      textSecondary: '#666666',
      background: '#ffffff',
      cardBackground: '#ffffff',
      border: '#f0f0f0',
      toggleActive: '#007bff',
      toggleInactive: '#ccc',
    };
  }
};

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <BackGround middle={true} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: insets.top }} />
        <View
          style={{
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 50,
          }}
        >
          <IconSettings style={{ marginBottom: 20 }} />
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 30,
              color: "#333",
            }}
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
  const [loading, setLoading] = useState(true);
  const isColorBlind = user?.settings?.colorBlindMode || false;
  const theme = getColorBlindTheme(isColorBlind);

  // États pour les paramètres
  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    vibrations: true,
    colorBlindMode: isColorBlind,
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
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <SettingItem
          title="Notifications push"
          description="Recevoir les notifications de l'application"
          value={settings.notifications}
          onValueChange={(value) => {
            const newSettings = { ...settings, notifications: value };
            updateSettings(newSettings);
          }}
        />
      </View>

      {/* Section Audio & Vibrations */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Audio & Vibrations</Text>

        <SettingItem
          title="Sons"
          description="Activer les sons de l'application"
          value={settings.sounds}
          onValueChange={(value) => {
            const newSettings = { ...settings, sounds: value };
            updateSettings(newSettings);
          }}
        />

        <SettingItem
          title="Vibrations"
          description="Activer les vibrations"
          value={settings.vibrations}
          onValueChange={(value) => {
            const newSettings = { ...settings, vibrations: value };
            updateSettings(newSettings);
          }}
        />
      </View>

      {/* Section Accessibilité */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Accessibilité</Text>

        <SettingItem
          title="Mode daltonien"
          description="Adapter les couleurs pour les personnes daltoniennes"
          value={settings.colorBlindMode}
          onValueChange={(value) => {
            const newSettings = { ...settings, colorBlindMode: value };
            updateSettings(newSettings);
          }}
        />
      </View>

      {/* Bouton Retour au profil */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.button, styles.profileButton]}
      >
        <IconAccount />
        <Text style={styles.profileButtonText}>Retour au profil</Text>
      </TouchableOpacity>

      {/* Bouton Déconnexion */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[styles.button, styles.logoutButton]}
      >
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
};

const SettingItem = ({ title, description, value, onValueChange }) => {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#ccc", true: "#007bff" }}
        thumbColor={value ? "#fff" : "#f4f3f4"}
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
