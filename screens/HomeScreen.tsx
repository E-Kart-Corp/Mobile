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
  Linking,
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
import Constants from "expo-constants";
import { Camera, CameraView } from "expo-camera";
import * as Device from "expo-device";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalList } from "../component/modal_list";
import { ButtonOpenModal } from "../component/button_open_modal";
import { LoginScreenNavigationProp } from "./authStack/LoginScreen";
import { useAuth } from "../authContext";
import { useAccessibility } from "../accessibilityContext";
import { sha1 } from "../utils";
import { useStripe, initStripe } from "@stripe/stripe-react-native";

// URL de base de l'API
const API_BASE_URL = "http://5.196.147.213:3000";

const HomeScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { triggerFeedback, announce } = useAccessibility();

  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [basket, setBasket] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isSimulator, setIsSimulator] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(
    "carrefour_sartrouville"
  );

  // Initialiser Stripe
  React.useEffect(() => {
    const initializeStripe = async () => {
      const stripePublishableKey = "pk_test_51Pz32cRsgOZX0KhASPKWQ10QxWcAHn4HCbEu54KqBukiPyltbS4BgijcBjkJMFYsbnCudKFDr6xpGyDenq0TZCKX00ylzml6Ro"
        // process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        // Constants?.expoConfig?.extra?.stripePublishableKey ||
        // Constants?.manifest2?.extra?.stripePublishableKey ||
        // Constants?.manifest?.extra?.stripePublishableKey;

      if (stripePublishableKey) {
        await initStripe({
          publishableKey: stripePublishableKey,
          merchantIdentifier: "merchant.com.ekart",
        });
      } else {
        console.warn(
          "Stripe publishable key is not configured. Payment will not work."
        );
      }
    };

    initializeStripe();
  }, []);

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
      announce("Prise de photo en cours");

      const photo = await cameraRef.takePictureAsync({
        quality: 0.1,
      });

      triggerFeedback("success");

      setImage(photo.uri);
      sendImage(photo.uri);

      announce("Photo prise et envoyée pour analyse");
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
            announce(
              `Panier mis à jour. ${basketData.length} articles`
            );
          }
        } else {
          setBasket([]);
        }
      },
      (err) => {
        triggerFeedback("error");
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
      triggerFeedback("success");
      announce("Produit supprimé du panier");
    } catch (error) {
      console.log("Erreur lors de la suppression du produit :", error);
      triggerFeedback("error");
      announce("Erreur lors de la suppression du produit");
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
              announce("Abandon du panier en cours");

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
              triggerFeedback("success");

              announce("Panier abandonné avec succès");

              Alert.alert(
                "Panier abandonné",
                "Votre panier a été abandonné et sauvegardé dans vos tickets."
              );
            } catch (error) {
              console.log("Erreur lors de l'abandon du panier :", error);
              announce("Erreur lors de l'abandon du panier");
              triggerFeedback("error");
              Alert.alert("Erreur", "Impossible d'abandonner le panier");
            }
          },
        },
      ]
    );
  };

const FEEDBACK_FORM_URL = "https://form.typeform.com/to/slfqQd2p";

  const popUp= () => {
    const timeout = setTimeout(() => {
      Alert.alert(
        "Votre avis compte",
        "Merci de nous aider à nous améliorer en répondant à ce questionnaire.",
        [
          { text: "Fermer", style: "cancel" },
          {
            text: "Remplir le formulaire",
            onPress: () => Linking.openURL(FEEDBACK_FORM_URL),
          },
        ]
      );
    }, 20 * 1000); // 20 seconds
  
    return () => clearTimeout(timeout)
  }

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
              announce("Paiement en cours, veuillez patienter");
              triggerFeedback("success");

              popUp()
              
              // Récupérer le token API pour l'authentification
              // const apiToken =
              //   process.env.EXPO_PUBLIC_API_TOKEN ||
              //   Constants?.expoConfig?.extra?.apiToken ||
              //   Constants?.manifest2?.extra?.apiToken ||
              //   Constants?.manifest?.extra?.apiToken;

              // let hashedApiKey = null;
              // if (apiToken) {
              //   try {
              //     hashedApiKey = await sha1(apiToken);
              //   } catch (err) {
              //     console.warn("Unable to hash API token", err);
              //   }
              // }

              // // Appeler l'endpoint pour créer le PaymentIntent
              // const response = await fetch(
              //   `${API_BASE_URL}/client/createPaymentIntent`,
              //   {
              //     method: "POST",
              //     headers: {
              //       "Content-Type": "application/json",
              //       ...(hashedApiKey ? { "x-api-key": hashedApiKey } : {}),
              //     },
              //     body: JSON.stringify({
              //       amount: Math.round(totalAmount * 100), // Convertir en centimes
              //       currency: "eur",
              //       userId: user.uid,
              //       storeId: selectedStoreId,
              //     }),
              //   }
              // );

              // if (!response.ok) {
              //   const errorData = await response.json();
              //   throw new Error(
              //     errorData.error || "Erreur lors de la création du PaymentIntent"
              //   );
              // }

              // const { clientSecret } = await response.json();

              // if (!clientSecret) {
              //   throw new Error("Client secret manquant dans la réponse");
              // }

              // // Initialiser le PaymentSheet avec le clientSecret
              // const { error: initError } = await initPaymentSheet({
              //   paymentIntentClientSecret: clientSecret,
              //   merchantDisplayName: "E-Kart",
              // });

              // if (initError) {
              //   throw new Error(initError.message);
              // }

              // // Présenter le PaymentSheet
              // const { error: presentError } = await presentPaymentSheet();

              // if (presentError) {
              //   if (presentError.code !== "Canceled") {
              //     throw new Error(presentError.message);
              //   } else {
              //     // L'utilisateur a annulé le paiement
              //     announce("Paiement annulé");
              //     return;
              //   }
              // }

              // Paiement réussi
              // Calculer le montant total pour le ticket
              const finalTotalAmount = basket.reduce((sum, item) => {
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
                finalTotalAmount
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

              announce(
                `Paiement réussi ! Montant payé: ${finalTotalAmount.toFixed(
                  2
                )} euros`
              );

              Alert.alert(
                "Paiement réussi ! 🎉",
                `Montant payé: ${finalTotalAmount.toFixed(
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
            } catch (error) {
              console.log("Erreur lors du paiement :", error);
              announce("Erreur lors du paiement");
              triggerFeedback("error");

              Alert.alert(
                "Erreur de paiement",
                error.message || "Le paiement a échoué. Veuillez réessayer."
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
          triggerFeedback("success");
          console.log("Produits mis à jour après vente.");
        } else {
          triggerFeedback("warning");
          console.warn(
            "Le store n'existe pas pour mettre à jour les produits."
          );
        }
      }

      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
      triggerFeedback("error");
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

    announce("Sélection d'image en cours");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      announce("Image sélectionnée avec succès");
    }
  };

  // console.log("token ->", user.)

  const sendImage = async (image_params = null) => {
    if (!image_params && !isSimulator) {
      Alert.alert("Erreur", "Aucune image sélectionnée");
      return;
    }
    if (!image && isSimulator) {
      Alert.alert("Erreur", "Aucune image sélectionnée");
      return;
    }

    triggerFeedback("success");

    announce("Envoi de l'image pour analyse");

    const fileType = isSimulator
      ? image.split(".").pop()
      : image_params.split(".").pop();

    console.log(fileType);

    const formData = new FormData();
    formData.append(
      "image",
      {
        uri: isSimulator ? image : image_params,
        name: `image.${fileType}`,
        type: `image/${fileType}`,
      } as any
    );

    const apiToken =
      process.env.EXPO_PUBLIC_API_TOKEN ||
      Constants?.expoConfig?.extra?.apiToken ||
      Constants?.manifest2?.extra?.apiToken ||
      Constants?.manifest?.extra?.apiToken;

    let hashedApiKey = null;

    if (!apiToken) {
      console.warn(
        "API token is not defined. Add EXPO_PUBLIC_API_TOKEN to your env or app config."
      );
    } else {
      try {
        hashedApiKey = await sha1(apiToken);
      } catch (err) {
        console.warn("Unable to hash API token", err);
      }
    }

    console.log (hashedApiKey)

    try {
      const response = await fetch(
        `${API_BASE_URL}/client/checkProduct/${selectedStoreId}/${user?.uid}`,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
            ...(hashedApiKey ? { "x-api-key": hashedApiKey } : {}),
          },
        }
      );

      const result = await response.json();
      console.log(result);
      triggerFeedback("success");

      announce("Image analysée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'image :", error);
      announce("Erreur lors de l'envoi de l'image");
      triggerFeedback("error");
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
            triggerFeedback("success");

            announce("QR Code détecté, vérification en cours");

            try {
              const scannedId = data.trim();
              const storeRef = doc(db, "commerce", scannedId);
              const storeSnap = await getDoc(storeRef);

              if (storeSnap.exists()) {
                setSelectedStoreId(scannedId);
                setErrorMessage("");
                announce(
                  `Connexion réussie au magasin ${scannedId}`
                );
                setTimeout(() => setHasScanned(false), 2000);
              } else {
                setErrorMessage("Ce magasin n'existe pas.");
                announce("Erreur : Ce magasin n'existe pas");
                setTimeout(() => setHasScanned(false), 2000);
              }
            } catch (err) {
              console.error("Erreur lors de la vérification du magasin :", err);
              setErrorMessage("Une erreur est survenue.");
              triggerFeedback("error");
              announce(
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
                          text: store.shopName || store.id,
                          onPress: () => {
                            setSelectedStoreId(store.id);
                            announce(
                              `Magasin changé pour ${store.name || store.id}`
                            );
                          },
                        }))
                      : [
                          {
                            text: "Disconnect",
                            onPress: () => {
                              setSelectedStoreId(null);
                              announce("Déconnecté du magasin");
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
