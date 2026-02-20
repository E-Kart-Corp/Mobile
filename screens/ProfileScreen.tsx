import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { BackGround } from "../component/background";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IconAccount,
  IconMail,
  IconPhone,
  IconSettings,
  IconTickets,
} from "../icon";
import { useNavigation } from "@react-navigation/native";
import { LoginScreenNavigationProp } from "./authStack/LoginScreen";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config";
import { deleteUser, onAuthStateChanged } from "firebase/auth";
import { useAuth } from "../authContext";
import { Ionicons } from "@expo/vector-icons";

const getColorBlindTheme = (isColorBlindMode) => {
  if (isColorBlindMode) {
    return {
      primary: "#0066CC",
      secondary: "#FFD700",
      success: "#4A90E2",
      warning: "#FF8C00",
      danger: "#000000",
      background: "#F8F9FA",
      surface: "#FFFFFF",
      text: "#000000",
      textSecondary: "#4A4A4A",
      border: "#CCCCCC",
      shadow: "#000000",

      buttonStyle: {
        borderWidth: 2,
        borderColor: "#000000",
      },
      textStyle: {
        fontWeight: "600",
        fontSize: 16,
      },
      containerStyle: {
        borderWidth: 1,
        borderColor: "#CCCCCC",
      },
    };
  } else {
    return {
      // Couleurs normales
      primary: "#007bff",
      secondary: "#6c757d",
      success: "#28a745",
      warning: "#ffc107",
      danger: "#dc3545",
      background: "#f8f9fa",
      surface: "#ffffff",
      text: "#000000",
      textSecondary: "#6c757d",
      border: "#dee2e6",
      shadow: "#000000",

      buttonStyle: {},
      textStyle: {},
      containerStyle: {},
    };
  }
};

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <BackGround middle={true} />
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          position: "absolute",
          top: insets.top + 10,
          left: 20,
          zIndex: 10,
          backgroundColor: "rgba(255,255,255,0.7)",
          padding: 8,
          borderRadius: 20,
        }}
      >
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

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
          <Image
            style={{
              top: 0,
              left: 0,
            }}
            source={require("./../assets/logo_account.png")}
          />
          <ProfileUser />
        </View>
      </ScrollView>
    </View>
  );
};

const ProfileUser = () => {
  const { user } = useAuth();

  // Détermine si le mode daltonien est activé
  const isColorBlindMode = user?.settings?.colorBlindMode || false;
  const theme = getColorBlindTheme(isColorBlindMode);

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    card: "",
    profileImage:
      "https://meta-q.cdn.bubble.io/f1717102933566x753149416257430700/Random%20User%20Generator%20.webp",
  });
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedInfo, setEditedInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const fetchUserInfo = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, "client", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserInfo({
          name: userData.name || "",
          email: userData.email || user.email || "",
          phone: userData.phone || "",
          card: userData.card || "",
          profileImage: userData.profileImage || userInfo.profileImage,
        });
      }
    } catch (error) {
      console.log("Erreur lors de la récupération des informations :", error);
      Alert.alert("Erreur", "Impossible de récupérer vos informations");
    } finally {
      setLoading(false);
    }
  };

  const updateUserInfo = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, "client", user.uid);
      await updateDoc(docRef, {
        name: editedInfo?.name || userInfo.name,
        email: editedInfo?.email || userInfo.email,
        phone: editedInfo?.phone || userInfo.phone,
        card: editedInfo?.card || userInfo.card,
        profileImage: editedInfo?.profileImage || userInfo.profileImage,
        updatedAt: new Date().toISOString(),
      });

      setUserInfo((prev) => ({
        ...prev,
        ...editedInfo,
      }));

      setIsEditModalVisible(false);
      setEditedInfo({});
      Alert.alert("Succès", "Vos informations ont été mises à jour");
    } catch (error) {
      console.log("Erreur lors de la mise à jour :", error);
      Alert.alert("Erreur", "Impossible de mettre à jour vos informations");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    Alert.alert(
      "Supprimer mon compte",
      "ATTENTION : Cette action est irréversible. Toutes vos données seront effacées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: async () => {
            try {
              const docRef = doc(db, "client", user.uid);
              await deleteDoc(docRef);

              const userAuth = auth.currentUser;
              if (userAuth) {
                await deleteUser(userAuth);
              }

              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (error) {
              console.log("Erreur lors de la suppression :", error);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Erreur",
                  "Veuillez vous reconnecter pour supprimer votre compte."
                );
              } else {
                Alert.alert(
                  "Erreur",
                  "Impossible de supprimer le compte : " + error.message
                );
              }
            }
          },
        },
      ]
    );
  };

  const clearUserInfo = async () => {
    if (!user?.uid) return;

    Alert.alert(
      "Confirmation",
      "Êtes-vous sûr de vouloir effacer toutes vos informations ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: async () => {
            try {
              const docRef = doc(db, "client", user.uid);
              await updateDoc(docRef, {
                name: "",
                phone: "",
                card: "",
                profileImage: "",
                current_kart: {
                  idStore: "",
                  kart: [],
                },
              });

              setUserInfo({
                name: "",
                email: user.email || "Email non renseigné",
                phone: "",
                card: "Carte non renseignée",
                profileImage:
                  "https://meta-q.cdn.bubble.io/f1717102933566x753149416257430700/Random%20User%20Generator%20.webp",
              });

              Alert.alert("Succès", "Vos informations ont été effacées");
            } catch (error) {
              console.log("Erreur lors de l'effacement :", error);
              Alert.alert("Erreur", "Impossible d'effacer vos informations");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user]);

  if (loading) {
    return (
      <View style={{ alignItems: "center", width: "100%", marginTop: 50 }}>
        <Text style={[theme.textStyle, { color: theme.text }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <View
        style={[
          {
            height: 140,
            width: 140,
            borderRadius: 70,
            marginTop: 20,
            shadowOpacity: 0.5,
            shadowRadius: 3,
            marginBottom: 25,
            shadowOffset: {
              height: 0,
              width: 0,
            },
            shadowColor: theme.shadow,
          },
          isColorBlindMode && {
            borderWidth: 3,
            borderColor: theme.primary,
          },
        ]}
      >
        <Image
          style={{ width: "100%", height: "100%", borderRadius: 70 }}
          source={{ uri: userInfo.profileImage }}
        />
      </View>

      <ItemInfos
        icon={<IconAccount />}
        text={userInfo.name}
        theme={theme}
        isColorBlindMode={isColorBlindMode}
      />
      <ItemInfos
        icon={<IconMail />}
        text={userInfo.email}
        theme={theme}
        isColorBlindMode={isColorBlindMode}
      />
      <ItemInfos
        icon={<IconPhone />}
        text={userInfo.phone}
        theme={theme}
        isColorBlindMode={isColorBlindMode}
      />

      <TouchableOpacity
        onPress={() => setIsEditModalVisible(true)}
        style={[
          theme.buttonStyle,
          {
            marginTop: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 5,
            backgroundColor: theme.primary,
          },
        ]}
      >
        <Text
          style={[
            theme.textStyle,
            {
              color: theme.surface,
              textAlign: "center",
            },
          ]}
        >
          {isColorBlindMode ? "✏️ " : ""}Editer mes informations
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={clearUserInfo}
        style={[
          theme.buttonStyle,
          {
            marginTop: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 5,
            backgroundColor: isColorBlindMode ? theme.danger : "lightblue",
            borderColor: theme.danger,
            borderWidth: 2,
          },
        ]}
      >
        <Text
          style={[
            theme.textStyle,
            {
              color: isColorBlindMode ? theme.surface : theme.danger,
              textAlign: "center",
            },
          ]}
        >
          {isColorBlindMode ? "🗑️ " : ""}Effacer mes informations
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDeleteAccount}
        style={[
          theme.buttonStyle,
          {
            marginTop: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 5,
            backgroundColor: theme.danger,
            borderColor: theme.danger,
            borderWidth: isColorBlindMode ? 2 : 0,
          },
        ]}
      >
        <Text
          style={[
            theme.textStyle,
            {
              color: theme.surface,
              textAlign: "center",
            },
          ]}
        >
          {isColorBlindMode ? "⚠️ " : ""}Supprimer mon compte
        </Text>
      </TouchableOpacity>

      {/* Modal d'édition */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={[
              {
                backgroundColor: theme.surface,
                width: "90%",
                padding: 20,
                borderRadius: 10,
              },
              theme.containerStyle,
            ]}
          >
            <Text
              style={[
                theme.textStyle,
                {
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 20,
                  color: theme.text,
                  textAlign: "center",
                },
              ]}
            >
              {isColorBlindMode ? "✏️ " : ""}Modifier mes informations
            </Text>

            <ScrollView>
              <View style={{ marginBottom: 15 }}>
                <Text
                  style={[
                    theme.textStyle,
                    { marginBottom: 5, color: theme.text },
                  ]}
                >
                  Nom :
                </Text>
                <TextInput
                  style={[
                    {
                      borderWidth: isColorBlindMode ? 2 : 1,
                      borderColor: theme.border,
                      padding: 10,
                      borderRadius: 5,
                      backgroundColor: theme.surface,
                      color: theme.text,
                    },
                    theme.textStyle,
                  ]}
                  value={
                    editedInfo.name !== undefined
                      ? editedInfo.name
                      : userInfo.name
                  }
                  onChangeText={(text) =>
                    setEditedInfo((prev) => ({ ...prev, name: text }))
                  }
                  placeholder="Votre nom"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text
                  style={[
                    theme.textStyle,
                    { marginBottom: 5, color: theme.text },
                  ]}
                >
                  Email :
                </Text>
                <TextInput
                  style={[
                    {
                      borderWidth: isColorBlindMode ? 2 : 1,
                      borderColor: theme.border,
                      padding: 10,
                      borderRadius: 5,
                      backgroundColor: theme.surface,
                      color: theme.text,
                    },
                    theme.textStyle,
                  ]}
                  value={
                    editedInfo.email !== undefined
                      ? editedInfo.email
                      : userInfo.email
                  }
                  onChangeText={(text) =>
                    setEditedInfo((prev) => ({ ...prev, email: text }))
                  }
                  placeholder="Votre email"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text
                  style={[
                    theme.textStyle,
                    { marginBottom: 5, color: theme.text },
                  ]}
                >
                  Téléphone :
                </Text>
                <TextInput
                  style={[
                    {
                      borderWidth: isColorBlindMode ? 2 : 1,
                      borderColor: theme.border,
                      padding: 10,
                      borderRadius: 5,
                      backgroundColor: theme.surface,
                      color: theme.text,
                    },
                    theme.textStyle,
                  ]}
                  value={
                    editedInfo.phone !== undefined
                      ? editedInfo.phone
                      : userInfo.phone
                  }
                  onChangeText={(text) =>
                    setEditedInfo((prev) => ({ ...prev, phone: text }))
                  }
                  placeholder="Votre téléphone"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsEditModalVisible(false);
                  setEditedInfo({});
                }}
                style={[
                  {
                    flex: 1,
                    padding: 15,
                    backgroundColor: theme.textSecondary,
                    borderRadius: 5,
                    marginRight: 10,
                  },
                  theme.buttonStyle,
                ]}
              >
                <Text
                  style={[
                    theme.textStyle,
                    { textAlign: "center", color: theme.surface },
                  ]}
                >
                  {isColorBlindMode ? "❌ " : ""}Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={updateUserInfo}
                style={[
                  {
                    flex: 1,
                    padding: 15,
                    backgroundColor: theme.primary,
                    borderRadius: 5,
                    marginLeft: 10,
                  },
                  theme.buttonStyle,
                ]}
              >
                <Text
                  style={[
                    theme.textStyle,
                    { textAlign: "center", color: theme.surface },
                  ]}
                >
                  {isColorBlindMode ? "💾 " : ""}Sauvegarder
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ButtonParams theme={theme} isColorBlindMode={isColorBlindMode} />
    </View>
  );
};

const ButtonParams = ({ theme, isColorBlindMode }) => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

  return (
    <View style={{ flexDirection: "row", marginTop: 70, marginBottom: 30 }}>
      <TouchableOpacity
        onPress={() => navigation.navigate("TicketsScreen")}
        style={[
          {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 15,
            marginRight: 5,
            borderRadius: 10,
            backgroundColor: theme.surface,
          },
          theme.containerStyle,
          theme.buttonStyle,
        ]}
      >
        <IconTickets />
        <Text style={[theme.textStyle, { marginTop: 20, color: theme.text }]}>
          {isColorBlindMode ? "🎫 " : ""}Tickets
        </Text>
      </TouchableOpacity>

      <View
        style={{
          width: 2,
          height: 100,
          backgroundColor: theme.border,
          marginHorizontal: 10,
        }}
      />

      <TouchableOpacity
        onPress={() => {
          navigation.navigate("Settings");
        }}
        style={[
          {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 15,
            marginLeft: 5,
            borderRadius: 10,
            backgroundColor: theme.surface,
          },
          theme.containerStyle,
          theme.buttonStyle,
        ]}
      >
        <IconSettings />
        <Text style={[theme.textStyle, { marginTop: 20, color: theme.text }]}>
          {isColorBlindMode ? "⚙️ " : ""}Paramètres
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const ItemInfos = ({ icon, text, theme, isColorBlindMode }) => {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
    >
      {icon}
      <View style={{ width: 10 }} />
      <View
        style={[
          {
            width: "75%",
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
            paddingHorizontal: 15,
            borderRadius: 10,
            shadowOpacity: 0.3,
            shadowRadius: 3,
            shadowOffset: {
              height: 2,
              width: 0,
            },
            shadowColor: theme.shadow,
          },
          theme.containerStyle,
        ]}
      >
        <Text style={[theme.textStyle, { color: theme.text }]}>{text}</Text>
      </View>
    </View>
  );
};

export default ProfileScreen;
