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
  const navigation = useNavigation<LoginScreenNavigationProp>();

  // user.settings.sounds # son boolean
  // user.settings.vibrations # son vibrations

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("store_eip");

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
      const photo = await cameraRef.takePictureAsync({
        quality: 0.1,
      });
      if (user.settings.sounds) {
        player.seekTo(0);
        player.play();
      }
      setImage(photo.uri);
      sendImage(photo.uri);
      triggerFeedback();
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
        } else {
          setBasket([]);
        }
      },
      (err) => {
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

              Alert.alert(
                "Panier abandonné",
                "Votre panier a été abandonné et sauvegardé dans vos tickets."
              );
            } catch (error) {
              console.log("Erreur lors de l'abandon du panier :", error);
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

          console.log("Produits mis à jour après vente.");
        } else {
          console.warn(
            "Le store n'existe pas pour mettre à jour les produits."
          );
        }
      }

      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
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
        `http://82.25.119.208:3000/client/checkProduct/${selectedStoreId}/${user?.uid}`,
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
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'image :", error);
      Alert.alert("Erreur", "L'envoi de l'image a échoué");
    }
  };

  const insets = useSafeAreaInsets();

  const [errorMessage, setErrorMessage] = useState("");
  const [hasScanned, setHasScanned] = useState(false);

  if (!isSimulator && !selectedStoreId) {
    return (
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

          try {
            const scannedId = data.trim();
            const storeRef = doc(db, "commerce", scannedId);
            const storeSnap = await getDoc(storeRef);

            if (storeSnap.exists()) {
              setSelectedStoreId(scannedId);
              setErrorMessage("");
              setTimeout(() => setHasScanned(false), 2000);
            } else {
              setErrorMessage("Ce magasin n'existe pas.");
              setTimeout(() => setHasScanned(false), 2000);
            }
          } catch (err) {
            console.error("Erreur lors de la vérification du magasin :", err);
            setErrorMessage("Une erreur est survenue.");
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
        ></View>

        <View
          style={{
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 10,
            backgroundColor: "white",
            borderRadius: 10,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>
            Veuillez scanner le QrCode du commerce
          </Text>
          {errorMessage ? (
            <Text style={{ color: "red", marginTop: 5 }}>{errorMessage}</Text>
          ) : null}
        </View>
      </CameraView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "lightgray" }}>
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
                          onPress: () => setSelectedStoreId(store.id),
                        }))
                      : [
                          {
                            text: "Disconnect",
                            onPress: () => setSelectedStoreId(null),
                          },
                          { text: "Non", onPress: () => {} },
                        ]
                  );
                }}
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
                />
              </TouchableOpacity>
            </View>

            <>
              {!isSimulator ? (
                <CameraView
                  style={{ flex: 1, width: "100%" }}
                  ref={(ref) => setCameraRef(ref)}
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
                      // marginBottom: 20,
                    }}
                  >
                    <Button title="Prendre une photo" onPress={takePicture} />
                    {/* <View style={{ height: 50 }} /> */}
                  </View>
                </CameraView>
              ) : (
                <>
                  <Button title="Pick an image" onPress={pickImage} />
                  {image && (
                    <>
                      <Image
                        source={{ uri: image }}
                        style={{
                          width: 200,
                          height: 200,
                          marginVertical: 16,
                          borderRadius: 8,
                        }}
                      />
                      <Button title="Send Image" onPress={sendImage} />
                    </>
                  )}
                </>
              )}
            </>
          </>
        ) : (
          <Text>
            Veuillez vous connecter pour voir votre panier et envoyer des
            images.
          </Text>
        )}
      </View>

      <ButtonOpenModal basket={basket} setModalVisible={setModalVisible} />

      <ModalList
        basket={basket}
        deleteBasket={abandonBasket}
        processPayment={processPayment}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
      />
    </View>
  );
};

export default HomeScreen;

// export default function HomeScreen() {
//   const player = useAudioPlayer(audioSource);

//   return (
//     <View
//       style={{
//         flex: 1,
//         justifyContent: "center",
//         backgroundColor: "#ecf0f1",
//         padding: 10,
//       }}
//     >
//       <Button title="Play Sound" onPress={() => player.play()} />
//       <Button
//         title="Replay Sound"
//         onPress={() => {
//           player.seekTo(0);
//           player.play();
//         }}
//       />
//     </View>
//   );
// }
