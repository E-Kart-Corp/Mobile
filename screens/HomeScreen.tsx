import React, { use, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Button,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Dimensions,
  Vibration,
  AccessibilityInfo,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../config";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { IconLocation } from "../icon";
import { useNavigation } from "@react-navigation/native";
import { useAudioPlayer } from "expo-audio";
import { Camera, CameraView } from "expo-camera";
import * as Device from "expo-device";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalList } from "../component/modal_list";
import { ButtonOpenModal } from "../component/button_open_modal";
import { LoginScreenNavigationProp } from "./authStack/LoginScreen";
import { useAuth } from "../authContext";
import { triggerFeedback } from "../component/trigger_feedback";
import * as Haptics from "expo-haptics";

import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const audioSource = require("../assets/sounds/feedback.mp3");

const HomeScreen = () => {
  const player = useAudioPlayer(audioSource);

  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [basket, setBasket] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isSimulator, setIsSimulator] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const triggerHapticSuccess = () => {
    if (user.settings.vibrations)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const triggerHapticWarning = () => {
    if (user.settings.vibrations)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const triggerHapticError = () => {
    if (user.settings.vibrations)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  // user.settings.sounds # son boolean
  // user.settings.vibrations # son vibrations

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("store_eip");

  // Vérifier si VoiceOver est activé
  useEffect(() => {
    const checkScreenReaderStatus = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(isEnabled);
    };

    checkScreenReaderStatus();

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  // Fonction pour annoncer des messages à VoiceOver
  const announceToScreenReader = (message) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");

      const isDeviceSimulator =
        !Device.isDevice || Device.modelName.includes("Simulator");
      setIsSimulator(isDeviceSimulator);
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      announceToScreenReader("Prise de photo en cours");

      const photo = await cameraRef.takePictureAsync({
        quality: 0.1,
      });

      triggerHapticSuccess();
      if (user.settings.sounds) {
        player.seekTo(0);
        player.play();
      }

      setImage(photo.uri);
      sendImage(photo.uri);
      triggerFeedback();

      announceToScreenReader("Photo prise et envoyée pour analyse");
    }
  };

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const storesCollection = collection(db, "commerce");
        const storesSnapshot = await getDocs(storesCollection);
        const storesList = storesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStores(storesList);
        if (storesList.length > 0) {
          setSelectedStoreId(storesList[2].id);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des magasins :", error);
      }
    };
    if (isSimulator) fetchStores();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const docRef = doc(db, "client", user.uid);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const basketData = docSnapshot.data()?.current_kart?.kart || [];
          setBasket(basketData);

          // Annoncer les changements du panier
          if (basketData.length > 0) {
            announceToScreenReader(
              `Panier mis à jour. ${basketData.length} articles`
            );
          }
        } else {
          setBasket([]);
        }
      },
      (err) => {
        triggerHapticError();
        console.log("Error listening to document:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const validBasketLength = basket.filter(
    (item) =>
      typeof item?.price === "number" && !isNaN(item.price) && item.product_name
  ).length;

  const realBasketLength = basket.length;

  const removeItemFromBasket = async (indexToRemove) => {
    if (!user?.uid) return;

    try {
      // Créer une copie du panier sans l'élément à supprimer
      const updatedBasket = basket.filter(
        (_, index) => index !== indexToRemove
      );

      // Mettre à jour Firebase
      const docRef = doc(db, "client", user.uid);
      await updateDoc(docRef, {
        current_kart: {
          idStore: selectedStoreId,
          kart: updatedBasket,
        },
      });

      // Mettre à jour l'état local
      setBasket(updatedBasket);

      // Retour haptique et annonce vocale
      triggerHapticSuccess();
      announceToScreenReader("Produit supprimé du panier");
    } catch (error) {
      console.log("Erreur lors de la suppression du produit :", error);
      triggerHapticError();
      announceToScreenReader("Erreur lors de la suppression du produit");
      Alert.alert("Erreur", "Impossible de supprimer le produit du panier");
    }
  };

  const abandonBasket = async () => {
    if (!user?.uid || realBasketLength === 0) return;

    Alert.alert(
      "Abandonner le panier",
      "Êtes-vous sûr de vouloir abandonner votre panier ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, abandonner",
          style: "destructive",
          onPress: async () => {
            try {
              announceToScreenReader("Abandon du panier en cours");

              // Calculer le montant total
              const totalAmount = basket.reduce((sum, item) => {
                const price = parseFloat(item?.price);
                const quantity = item?.quantity || 1;

                if (!isNaN(price)) {
                  return sum + price * quantity;
                }

                return sum;
              }, 0);

              // Créer un ticket avec le statut "cancelled"
              await createTicket(
                "cancelled",
                basket,
                selectedStoreId,
                totalAmount
              );

              // Vider le panier
              const docRef = doc(db, "client", user.uid);
              await updateDoc(docRef, {
                current_kart: {
                  idStore: "",
                  kart: [],
                },
              });

              setBasket([]);
              setModalVisible(false);
              triggerHapticSuccess();

              announceToScreenReader("Panier abandonné avec succès");

              Alert.alert(
                "Panier abandonné",
                "Votre panier a été abandonné et sauvegardé dans vos tickets."
              );
            } catch (error) {
              console.log("Erreur lors de l'abandon du panier :", error);
              announceToScreenReader("Erreur lors de l'abandon du panier");
              triggerHapticError();
              Alert.alert("Erreur", "Impossible d'abandonner le panier");
            }
          },
        },
      ]
    );
  };

  const processPayment = async () => {
    if (!user?.uid || validBasketLength === 0) return;

    const totalAmount = basket.reduce((sum, item) => {
      const price = parseFloat(item?.price);
      const quantity = item?.quantity || 1;

      if (!isNaN(price)) {
        return sum + price * quantity;
      }

      return sum;
    }, 0);

    Alert.alert(
      "Confirmer le paiement",
      `Montant total: ${totalAmount.toFixed(2)}€\n\nConfirmer le paiement ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Payer",
          onPress: async () => {
            try {
              announceToScreenReader("Paiement en cours, veuillez patienter");

              triggerHapticSuccess();

              // Simuler un délai de paiement
              Alert.alert("Paiement en cours...", "Veuillez patienter");

              // Calculer le montant total
              const totalAmount = basket.reduce((sum, item) => {
                const price = parseFloat(item?.price);
                const quantity = item?.quantity || 1;

                if (!isNaN(price)) {
                  return sum + price * quantity;
                }

                return sum;
              }, 0);

              // Créer un ticket avec le statut "completed"
              await createTicket(
                "completed",
                basket,
                selectedStoreId,
                totalAmount
              );

              // Vider le panier après paiement réussi
              const docRef = doc(db, "client", user.uid);
              await updateDoc(docRef, {
                current_kart: {
                  idStore: "",
                  kart: [],
                },
              });

              setBasket([]);
              setModalVisible(false);

              // Simuler un délai puis afficher succès
              setTimeout(() => {
                announceToScreenReader(
                  `Paiement réussi ! Montant payé: ${totalAmount.toFixed(
                    2
                  )} euros`
                );

                Alert.alert(
                  "Paiement réussi ! 🎉",
                  `Montant payé: ${totalAmount.toFixed(
                    2
                  )}€\nMerci pour votre achat !`,
                  [
                    {
                      text: "Voir mes tickets",
                      onPress: () => navigation.navigate("TicketsScreen"),
                    },
                    { text: "OK" },
                  ]
                );
              }, 1500);
            } catch (error) {
              console.log("Erreur lors du paiement :", error);
              announceToScreenReader("Erreur lors du paiement");
              triggerHapticError();

              Alert.alert(
                "Erreur de paiement",
                "Le paiement a échoué. Veuillez réessayer."
              );
            }
          },
        },
      ]
    );
  };

  const createTicket = async (status, basket, selectedStoreId, totalAmount) => {
    if (!user?.uid) return;

    try {
      const ticketData = {
        userId: user.uid,
        status: status, // 'completed' ou 'cancelled'
        storeName: selectedStoreId,
        totalAmount: totalAmount.toFixed(2),
        items: basket
          .filter(
            (item) => typeof item?.price === "number" && !isNaN(item.price)
          )
          .map((item) => ({
            product_id: item.product_id,
            name: item.product_name,
            quantity: item.quantity || 1,
            price: item.price,
            image: item.image_link || "",
          })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log(ticketData);

      const ticketsCollection = collection(db, "tickets");
      const docRef = await addDoc(ticketsCollection, ticketData);

      console.log("Ticket créé avec l'ID:", docRef.id);

      // 🚀 Si status = completed, mettre à jour item_sold
      if (status === "completed") {
        const storeRef = doc(db, "commerce", selectedStoreId);
        const storeSnap = await getDoc(storeRef);

        if (storeSnap.exists()) {
          const storeData = storeSnap.data();
          const currentProducts = storeData.products || [];

          // Mettre à jour les item_sold
          const updatedProducts = currentProducts.map((product) => {
            // Chercher si le produit est dans le panier
            const soldItem = ticketData.items.find(
              (item) => item.product_id === product.product_id
            );

            if (soldItem) {
              return {
                ...product,
                item_sold: (product.item_sold || 0) + soldItem.quantity,
              };
            } else {
              return product;
            }
          });

          // Sauvegarder
          await updateDoc(storeRef, {
            products: updatedProducts,
          });
          triggerHapticSuccess();
          console.log("Produits mis à jour après vente.");
        } else {
          triggerHapticWarning();
          console.warn(
            "Le store n'existe pas pour mettre à jour les produits."
          );
        }
      }

      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
      triggerHapticError();
      throw error;
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    announceToScreenReader("Sélection d'image en cours");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      announceToScreenReader("Image sélectionnée avec succès");
    }
  };

  const sendImage = async (image_params = null) => {
    if (!image_params && !isSimulator) {
      Alert.alert("Erreur", "Aucune image sélectionnée");
      return;
    }
    if (!image && isSimulator) {
      Alert.alert("Erreur", "Aucune image sélectionnée");
      return;
    }

    triggerHapticSuccess();

    announceToScreenReader("Envoi de l'image pour analyse");

    const fileType = isSimulator
      ? image.split(".").pop()
      : image_params.split(".").pop();

    console.log(fileType);

    const formData = new FormData();
    formData.append("image", {
      uri: isSimulator ? image : image_params,
      name: `image.${fileType}`,
      type: `image/${fileType}`,
    });

    try {
      const response = await fetch(
        // `http://51.210.212.247:3000/client/checkProduct/${selectedStoreId}/${user?.uid}`,
        `http://5.196.147.213:3000/client/checkProduct/${selectedStoreId}/${user?.uid}`,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = await response.json();
      console.log(result);
      triggerHapticSuccess();

      announceToScreenReader("Image analysée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'image :", error);
      announceToScreenReader("Erreur lors de l'envoi de l'image");
      triggerHapticError();
      Alert.alert("Erreur", "L'envoi de l'image a échoué");
    }
  };

  const insets = useSafeAreaInsets();

  const [errorMessage, setErrorMessage] = useState("");
  const [hasScanned, setHasScanned] = useState(false);

  if (!isSimulator && !selectedStoreId) {
    return (
      <View
        style={{ flex: 1 }}
        accessible={true}
        accessibilityLabel="Écran de scan QR Code"
        accessibilityHint="Positionnez le QR Code du magasin dans le cadre pour vous connecter"
      >
        <CameraView
          style={{
            flex: 1,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
          ref={(ref) => setCameraRef(ref)}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={async ({ data }) => {
            if (hasScanned) return;
            setHasScanned(true);
            triggerHapticSuccess();

            announceToScreenReader("QR Code détecté, vérification en cours");

            try {
              const scannedId = data.trim();
              const storeRef = doc(db, "commerce", scannedId);
              const storeSnap = await getDoc(storeRef);

              if (storeSnap.exists()) {
                setSelectedStoreId(scannedId);
                setErrorMessage("");
                announceToScreenReader(
                  `Connexion réussie au magasin ${scannedId}`
                );
                setTimeout(() => setHasScanned(false), 2000);
              } else {
                setErrorMessage("Ce magasin n'existe pas.");
                announceToScreenReader("Erreur : Ce magasin n'existe pas");
                setTimeout(() => setHasScanned(false), 2000);
              }
            } catch (err) {
              console.error("Erreur lors de la vérification du magasin :", err);
              setErrorMessage("Une erreur est survenue.");
              triggerHapticError();
              announceToScreenReader(
                "Une erreur est survenue lors de la vérification"
              );
              setTimeout(() => setHasScanned(false), 2000);
            }
          }}
        >
          <View
            style={{
              width: 200,
              height: 200,
              borderWidth: 4,
              zIndex: 999,
              alignSelf: "center",
              alignItems: "center",
            }}
            accessible={true}
            accessibilityLabel="Cadre de scan QR Code"
            accessibilityHint="Positionnez le QR Code du magasin dans ce cadre"
          ></View>

          <View
            style={{
              marginTop: 10,
              paddingHorizontal: 10,
              paddingVertical: 10,
              backgroundColor: "white",
              borderRadius: 10,
            }}
            accessible={true}
            accessibilityLabel={
              errorMessage
                ? `Erreur : ${errorMessage}`
                : "Veuillez scanner le QR Code du commerce"
            }
            accessibilityRole="text"
          >
            <Text style={{ fontWeight: "bold" }}>
              Veuillez scanner le QrCode du commerce
            </Text>
            {errorMessage ? (
              <Text style={{ color: "red", marginTop: 5 }}>{errorMessage}</Text>
            ) : null}
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "lightgray" }}
      accessible={false}
      accessibilityLabel="Écran principal de l'application"
    >
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {user ? (
          <>
            <View
              style={{
                width: "90%",
                height: 50,
                borderRadius: 100,
                backgroundColor: "white",
                position: "absolute",
                flexDirection: "row",
                zIndex: 999,
                top: insets.top + 10,
                alignItems: "center",
                justifyContent: "space-between",
              }}
              accessible={true}
              accessibilityLabel="Barre de navigation"
              accessibilityRole="toolbar"
            >
              <View>
                <Image
                  source={require("../assets/E-VertClair.png")}
                  style={{
                    width: 40,
                    height: 40,
                    marginVertical: 16,
                    borderRadius: 8,
                  }}
                  accessible={true}
                  accessibilityLabel="Logo de l'application"
                  accessibilityRole="image"
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Se déconnecter du magasin",
                    "Souhaitez-vous vous déconnecter ?",
                    isSimulator
                      ? stores.map((store) => ({
                          text: store.name || store.id,
                          onPress: () => {
                            setSelectedStoreId(store.id);
                            announceToScreenReader(
                              `Magasin changé pour ${store.name || store.id}`
                            );
                          },
                        }))
                      : [
                          {
                            text: "Disconnect",
                            onPress: () => {
                              setSelectedStoreId(null);
                              announceToScreenReader("Déconnecté du magasin");
                            },
                          },
                          { text: "Non", onPress: () => {} },
                        ]
                  );
                }}
                accessible={true}
                accessibilityLabel={`Magasin actuel : ${selectedStoreId}. Appuyez pour changer`}
                accessibilityHint="Ouvre les options pour changer de magasin"
                accessibilityRole="button"
              >
                <View style={{ flexDirection: "row" }}>
                  <IconLocation />
                  <Text>{selectedStoreId}</Text>
                </View>
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    color: "#007A5E",
                    textDecorationLine: "underline",
                  }}
                >
                  Changer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("Profile");
                }}
                accessible={true}
                accessibilityLabel="Aller au profil utilisateur"
                accessibilityHint="Ouvre la page de profil"
                accessibilityRole="button"
              >
                <Image
                  source={{
                    uri: "https://meta-q.cdn.bubble.io/f1717102933566x753149416257430700/Random%20User%20Generator%20.webp",
                  }}
                  style={{
                    width: 50,
                    height: 50,
                    marginVertical: 16,
                    borderRadius: 25,
                  }}
                  accessible={true}
                  accessibilityLabel="Photo de profil"
                  accessibilityRole="image"
                />
              </TouchableOpacity>
            </View>

            <>
              {!isSimulator ? (
                <CameraView
                  style={{ flex: 1, width: "100%" }}
                  ref={(ref) => setCameraRef(ref)}
                  accessible={true}
                  accessibilityLabel="Caméra pour scanner les produits"
                  accessibilityHint="Pointez la caméra vers un produit et appuyez sur le bouton pour l'ajouter au panier"
                >
                  <View
                    style={{
                      // flex: 1,
                      width: "100%",
                      zIndex: 999,
                      backgroundColor: "transparent",
                      position: "absolute",
                      bottom: 120,
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={takePicture}
                      accessible={true}
                      accessibilityLabel="Prendre une photo du produit"
                      accessibilityHint="Capture une photo du produit pour l'ajouter au panier"
                      accessibilityRole="button"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        padding: 15,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        Prendre une photo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </CameraView>
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                  }}
                  accessible={true}
                  accessibilityLabel="Mode simulateur"
                >
                  <TouchableOpacity
                    onPress={pickImage}
                    accessible={true}
                    accessibilityLabel="Sélectionner une image"
                    accessibilityHint="Ouvre la galerie pour sélectionner une image de produit"
                    accessibilityRole="button"
                    style={{
                      backgroundColor: "#007A5E",
                      padding: 15,
                      borderRadius: 10,
                      marginBottom: 20,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Sélectionner une image
                    </Text>
                  </TouchableOpacity>

                  {image && (
                    <View style={{ alignItems: "center" }}>
                      <Image
                        source={{ uri: image }}
                        style={{
                          width: 200,
                          height: 200,
                          marginVertical: 16,
                          borderRadius: 8,
                        }}
                        accessible={true}
                        accessibilityLabel="Image sélectionnée du produit"
                        accessibilityRole="image"
                      />
                      <TouchableOpacity
                        onPress={sendImage}
                        accessible={true}
                        accessibilityLabel="Envoyer l'image"
                        accessibilityHint="Envoie l'image sélectionnée pour analyse et ajout au panier"
                        accessibilityRole="button"
                        style={{
                          backgroundColor: "#007A5E",
                          padding: 15,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "bold" }}>
                          Envoyer l'image
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </>
          </>
        ) : (
          <Text
            accessible={true}
            accessibilityLabel="Veuillez vous connecter pour utiliser l'application"
            accessibilityRole="text"
          >
            Veuillez vous connecter pour voir votre panier et envoyer des
            images.
          </Text>
        )}
      </View>

      <ButtonOpenModal
        basket={basket}
        setModalVisible={setModalVisible}
        // Assurez-vous que ce composant a aussi les bonnes propriétés d'accessibilité
      />

      <ModalList
        basket={basket}
        deleteBasket={abandonBasket}
        processPayment={processPayment}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        removeItemFromBasket={removeItemFromBasket}
        // Assurez-vous que ce composant a aussi les bonnes propriétés d'accessibilité
      />
    </View>
  );
};

export default HomeScreen;
