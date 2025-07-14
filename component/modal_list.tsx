import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Path, Svg } from "react-native-svg";
import { IconAcitivate, IconTopArrow } from "../icon";
import { useState } from "react";

const screenWidth = Dimensions.get("window").width;

export const ModalList = ({
  modalVisible,
  setModalVisible,
  deleteBasket,
  basket,
  processPayment,
}) => {
  const [showNutrition, setShowNutrition] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [nutritionData, setNutritionData] = useState(null);
  const [loading, setLoading] = useState(false);

  const validBasketLength = basket.filter(
    (item) =>
      typeof item?.price === "number" && !isNaN(item.price) && item.product_name
  ).length;

  const realBasketLength = basket.length;

  // Calculer le total du panier
  const totalAmount = basket.reduce((sum, item) => {
    const price = parseFloat(item?.price);
    const quantity = item?.quantity || 1;

    if (!isNaN(price)) {
      return sum + price * quantity;
    }

    return sum;
  }, 0);

  // Fonction pour récupérer les informations nutritionnelles
  const fetchNutritionInfo = async (product) => {
    setLoading(true);
    setSelectedProduct(product);

    try {
      const barcode = product.barcode || product.code || product.id;

      if (!barcode) {
        Alert.alert("Erreur", "Code-barres du produit introuvable");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://world.openfoodfacts.net/api/v2/product/${barcode}.json`,
        {
          method: "GET",
          headers: {
            Authorization: "Basic " + btoa("off:off"),
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.status === 1 && data.product) {
        setNutritionData(data.product);
        setShowNutrition(true);
      } else {
        Alert.alert(
          "Information non disponible",
          "Les informations nutritionnelles pour ce produit ne sont pas disponibles dans notre base de données."
        );
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      Alert.alert(
        "Erreur de connexion",
        "Impossible de récupérer les informations nutritionnelles. Vérifiez votre connexion internet."
      );
    } finally {
      setLoading(false);
    }
  };

  // Composant pour afficher les informations nutritionnelles
  const NutritionInfo = ({ data }) => {
    const nutriments = data.nutriments || {};
    const ingredients = data.ingredients_text || "Non disponible";

    return (
      <ScrollView
        style={{ flex: 1 }}
        accessible={true}
        accessibilityLabel="Informations nutritionnelles du produit"
        accessibilityRole="scrollbar"
      >
        <View style={{ padding: 20 }}>
          {/* Informations générales */}
          <View
            style={{ marginBottom: 20 }}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Informations générales du produit. Nom: ${
              data.product_name || "Non disponible"
            }. Marque: ${data.brands || "Non disponible"}. Catégorie: ${
              data.categories || "Non disponible"
            }`}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
              accessibilityRole="header"
            >
              Informations générales
            </Text>
            <Text style={{ marginBottom: 5 }}>
              <Text style={{ fontWeight: "bold" }}>Nom: </Text>
              {data.product_name || "Non disponible"}
            </Text>
            <Text style={{ marginBottom: 5 }}>
              <Text style={{ fontWeight: "bold" }}>Marque: </Text>
              {data.brands || "Non disponible"}
            </Text>
            <Text style={{ marginBottom: 5 }}>
              <Text style={{ fontWeight: "bold" }}>Catégorie: </Text>
              {data.categories || "Non disponible"}
            </Text>
          </View>

          {/* Ingrédients */}
          <View
            style={{ marginBottom: 20 }}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Ingrédients: ${ingredients}`}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
              accessibilityRole="header"
            >
              Ingrédients
            </Text>
            <Text style={{ lineHeight: 20 }}>{ingredients}</Text>
          </View>

          {/* Informations nutritionnelles */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
              accessibilityRole="header"
            >
              Valeurs nutritionnelles (pour 100g/100ml)
            </Text>

            {Object.keys(nutriments).length > 0 ? (
              <View
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={`Valeurs nutritionnelles pour 100 grammes ou 100 millilitres. ${
                  nutriments.energy_kcal
                    ? `Énergie: ${nutriments.energy_kcal} kilocalories. `
                    : ""
                }${
                  nutriments.fat
                    ? `Matières grasses: ${nutriments.fat} grammes. `
                    : ""
                }${
                  nutriments.carbohydrates
                    ? `Glucides: ${nutriments.carbohydrates} grammes. `
                    : ""
                }${
                  nutriments.proteins
                    ? `Protéines: ${nutriments.proteins} grammes. `
                    : ""
                }${nutriments.salt ? `Sel: ${nutriments.salt} grammes. ` : ""}`}
              >
                {nutriments.energy_kj && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Énergie (kJ)</Text>
                    <Text>{nutriments.energy_kj} kJ</Text>
                  </View>
                )}
                {nutriments.energy_kcal && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Énergie (kcal)</Text>
                    <Text>{nutriments.energy_kcal} kcal</Text>
                  </View>
                )}
                {nutriments.fat && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Matières grasses</Text>
                    <Text>{nutriments.fat} g</Text>
                  </View>
                )}
                {nutriments.carbohydrates && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Glucides</Text>
                    <Text>{nutriments.carbohydrates} g</Text>
                  </View>
                )}
                {nutriments.sugars && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text> dont sucres</Text>
                    <Text>{nutriments.sugars} g</Text>
                  </View>
                )}
                {nutriments.proteins && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Protéines</Text>
                    <Text>{nutriments.proteins} g</Text>
                  </View>
                )}
                {nutriments.salt && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Sel</Text>
                    <Text>{nutriments.salt} g</Text>
                  </View>
                )}
                {nutriments.fiber && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Fibres</Text>
                    <Text>{nutriments.fiber} g</Text>
                  </View>
                )}
                {nutriments.sodium && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text>Sodium</Text>
                    <Text>{nutriments.sodium} mg</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ fontStyle: "italic", color: "#666" }}>
                Informations nutritionnelles non disponibles
              </Text>
            )}
          </View>

          {/* Nutri-Score */}
          {data.nutriscore_grade && (
            <View
              style={{ marginBottom: 20 }}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Nutri-Score: ${data.nutriscore_grade.toUpperCase()}`}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
                accessibilityRole="header"
              >
                Nutri-Score
              </Text>
              <View
                style={{
                  backgroundColor: getNutriScoreColor(data.nutriscore_grade),
                  padding: 10,
                  borderRadius: 5,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {data.nutriscore_grade.toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {/* Allergènes */}
          {data.allergens && (
            <View
              style={{ marginBottom: 20 }}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Allergènes: ${data.allergens}`}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
                accessibilityRole="header"
              >
                Allergènes
              </Text>
              <Text>{data.allergens}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Fonction pour obtenir la couleur du Nutri-Score
  const getNutriScoreColor = (grade) => {
    switch (grade.toLowerCase()) {
      case "a":
        return "#038141";
      case "b":
        return "#85BB2F";
      case "c":
        return "#FECB02";
      case "d":
        return "#EE8100";
      case "e":
        return "#E63312";
      default:
        return "#666";
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
      accessible={true}
      accessibilityLabel="Panier d'achat"
      accessibilityRole="dialog"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {/* Vue des informations nutritionnelles */}
        {showNutrition && nutritionData ? (
          <View
            style={{
              width: "100%",
              height: "90%",
              backgroundColor: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: "#007A5E",
                padding: 15,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowNutrition(false)}
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Retour au panier"
                accessibilityHint="Appuyez pour revenir à la vue du panier"
              >
                <Text
                  style={{ color: "white", fontSize: 18, fontWeight: "bold" }}
                  importantForAccessibility="no"
                >
                  ←
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "bold",
                  flex: 1,
                }}
                accessibilityRole="header"
              >
                Informations nutritionnelles
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNutrition(false);
                  setModalVisible(false);
                }}
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                accessibilityHint="Appuyez pour fermer la fenêtre"
              >
                <Text
                  style={{ color: "white", fontSize: 18, fontWeight: "bold" }}
                  importantForAccessibility="no"
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contenu nutritionnel */}
            <NutritionInfo data={nutritionData} />
          </View>
        ) : (
          /* Vue normale du panier */
          <>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                width: "100%",
                alignItems: "center",
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Fermer le panier"
              accessibilityHint="Appuyez pour fermer la fenêtre du panier"
            >
              <Svg height="110" width={screenWidth}>
                <Path
                  d={`M0 50 Q${
                    screenWidth / 2
                  } -40 ${screenWidth} 50 L${screenWidth} 110 L0 110 Z`}
                  fill="white"
                />
              </Svg>
              <View
                style={{
                  position: "absolute",
                  top: 20,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Bouton Abandon */}
                <TouchableOpacity
                  onPress={deleteBasket}
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 40,
                    width: 77,
                    height: 35,
                    borderRadius: 17.5,
                    backgroundColor: "#EC263D",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Abandonner le panier"
                  accessibilityHint="Appuyez pour vider complètement votre panier"
                >
                  <IconAcitivate importantForAccessibility="no" />
                  <Text
                    style={{ fontSize: 10, color: "white" }}
                    importantForAccessibility="no"
                  >
                    Abandon
                  </Text>
                </TouchableOpacity>

                {/* Bouton Payer */}
                <TouchableOpacity
                  onPress={processPayment}
                  style={{
                    position: "absolute",
                    top: 20,
                    left: 40,
                    width: 77,
                    height: 35,
                    borderRadius: 17.5,
                    backgroundColor:
                      validBasketLength > 0 ? "#28a745" : "#6c757d",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  disabled={validBasketLength === 0}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={
                    validBasketLength > 0
                      ? `Payer ${totalAmount.toFixed(2)} euros`
                      : "Payer - panier vide"
                  }
                  accessibilityHint={
                    validBasketLength > 0
                      ? "Appuyez pour procéder au paiement"
                      : "Ajoutez des articles au panier pour pouvoir payer"
                  }
                  accessibilityState={{ disabled: validBasketLength === 0 }}
                >
                  <Text
                    style={{ fontSize: 10, color: "white", fontWeight: "bold" }}
                    importantForAccessibility="no"
                  >
                    Payer
                  </Text>
                </TouchableOpacity>

                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <IconTopArrow importantForAccessibility="no" />
                </View>
                <Text style={{ fontSize: 10 }} accessibilityRole="text">
                  Votre panier
                </Text>
                <Text
                  style={{ fontSize: 25, fontWeight: "bold" }}
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLabel={`Total: ${totalAmount.toFixed(2)} euros`}
                >
                  {totalAmount.toFixed(2)}€
                </Text>
                <Text>{""}</Text>
                <View
                  style={{
                    left: 0,
                    flexDirection: "row",
                    width: "95%",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 10, color: "#FF3333" }}
                    accessible={true}
                    accessibilityRole="text"
                  >
                    Auto-paiement à la sortie
                  </Text>
                  <Text
                    style={{ fontSize: 13 }}
                    accessible={true}
                    accessibilityRole="text"
                    accessibilityLabel={`${validBasketLength} article${
                      validBasketLength > 1 ? "s" : ""
                    } dans le panier`}
                  >
                    Nombre d'articles: {validBasketLength}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View
              style={{
                width: "100%",
                height: "70%",
                bottom: 0,
                backgroundColor: "white",
                borderTopWidth: 1,
                alignItems: "center",
              }}
            >
              {realBasketLength === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLabel="Votre panier est vide. Scannez des produits pour les ajouter."
                >
                  <Text style={{ fontSize: 16, color: "#666" }}>
                    Votre panier est vide
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999", marginTop: 5 }}>
                    Scannez des produits pour les ajouter
                  </Text>
                </View>
              ) : (
                <FlatList
                  style={{ width: "100%" }}
                  showsVerticalScrollIndicator={false}
                  data={basket}
                  keyExtractor={(item, index) => index.toString()}
                  accessible={true}
                  accessibilityRole="list"
                  accessibilityLabel={`Liste des articles dans votre panier. ${validBasketLength} article${
                    validBasketLength > 1 ? "s" : ""
                  }`}
                  renderItem={({ item, index }) =>
                    item.product_name === "null" ? (
                      <View
                        style={{
                          backgroundColor: "#007A5E",
                          alignSelf: "center",
                          width: "90%",
                          marginTop: 15,
                          paddingTop: 3,
                          paddingBottom: 3,
                          paddingLeft: 3,
                          flexDirection: "row",
                          alignItems: "center",
                          borderRadius: 100,
                        }}
                        accessible={true}
                        accessibilityRole="text"
                        accessibilityLabel={`Message: ${item?.message}`}
                      >
                        <View
                          style={{
                            flex: 1,
                            paddingHorizontal: 20,
                            height: "100%",
                          }}
                        >
                          <Text
                            numberOfLines={2}
                            style={{
                              color: "white",
                              fontWeight: "bold",
                            }}
                            importantForAccessibility="no"
                          >
                            {item?.message}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: "#007A5E",
                          alignSelf: "center",
                          width: "90%",
                          marginTop: 15,
                          paddingTop: 3,
                          paddingBottom: 3,
                          paddingLeft: 3,
                          flexDirection: "row",
                          alignItems: "center",
                          borderRadius: 100,
                        }}
                        accessible={true}
                        accessibilityRole="listitem"
                        accessibilityLabel={`Article ${index + 1}. ${
                          item?.product_name || "Produit inconnu"
                        }${
                          item?.quantity && item?.quantity > 1
                            ? `. Quantité: ${item.quantity}`
                            : ""
                        }. Prix: ${(
                          (item.price || 0) * (item.quantity || 1)
                        ).toFixed(2)} euros`}
                      >
                        <View>
                          <FallbackImage
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 25,
                              backgroundColor: "white",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 10,
                            }}
                            uri={item?.image_link}
                            accessible={true}
                            accessibilityRole="image"
                            accessibilityLabel={`Image du produit ${
                              item?.product_name || "Produit inconnu"
                            }`}
                          />
                        </View>
                        <View
                          style={{
                            flex: 1,
                            height: "100%",
                          }}
                        >
                          <Text
                            lineBreakMode="head"
                            numberOfLines={1}
                            style={{
                              position: "absolute",
                              width: "80%",
                              top: 0,
                              color: "white",
                              fontWeight: "bold",
                            }}
                            importantForAccessibility="no"
                          >
                            {item?.product_name || "Produit inconnu"}
                          </Text>
                          <TouchableOpacity
                            style={{
                              position: "absolute",
                              bottom: 0,
                            }}
                            onPress={() => fetchNutritionInfo(item)}
                            disabled={loading}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={
                              loading && selectedProduct === item
                                ? "Chargement des informations nutritionnelles"
                                : `Voir les informations nutritionnelles de ${
                                    item?.product_name || "ce produit"
                                  }`
                            }
                            accessibilityHint="Appuyez pour afficher les détails nutritionnels"
                            accessibilityState={{
                              disabled: loading && selectedProduct === item,
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                textDecorationLine: "underline",
                              }}
                              importantForAccessibility="no"
                            >
                              {loading && selectedProduct === item
                                ? "Chargement..."
                                : "Info nutrition"}
                            </Text>
                          </TouchableOpacity>

                          <View
                            style={{
                              position: "absolute",
                              right: 0,
                              height: 40,
                              justifyContent: "center",
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            {item?.quantity && item?.quantity > 1 && (
                              <Text
                                style={{
                                  backgroundColor: "white",
                                  borderRadius: 10,
                                  paddingHorizontal: 8,
                                  marginRight: 5,
                                  fontSize: 12,
                                  fontWeight: "bold",
                                }}
                                importantForAccessibility="no"
                              >
                                x{item.quantity}
                              </Text>
                            )}
                            <Text
                              style={{
                                backgroundColor: "white",
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                fontWeight: "bold",
                              }}
                              importantForAccessibility="no"
                            >
                              {(
                                (item.price || 0) * (item.quantity || 1)
                              ).toFixed(2)}
                              €
                            </Text>
                          </View>
                        </View>
                      </View>
                    )
                  }
                  ListFooterComponent={
                    <View
                      style={{ padding: 20, alignItems: "center" }}
                      accessible={true}
                      accessibilityRole="text"
                      accessibilityLabel={`Fin de la liste. Total du panier: ${totalAmount.toFixed(
                        2
                      )} euros pour ${validBasketLength} article${
                        validBasketLength > 1 ? "s" : ""
                      }`}
                    >
                      <Text style={{ color: "gray" }}>
                        Vous êtes arrivé en bas 🛒
                      </Text>
                      <View
                        style={{
                          marginTop: 10,
                          padding: 15,
                          backgroundColor: "#f8f9fa",
                          borderRadius: 10,
                          width: "90%",
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: 16,
                          }}
                          importantForAccessibility="no"
                        >
                          Total: {totalAmount.toFixed(2)}€
                        </Text>
                        <Text
                          style={{
                            textAlign: "center",
                            color: "#666",
                            marginTop: 5,
                          }}
                          importantForAccessibility="no"
                        >
                          {validBasketLength} article
                          {validBasketLength > 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                  }
                />
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const FallbackImage = ({
  uri,
  style,
  accessible,
  accessibilityRole,
  accessibilityLabel,
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <Image
      style={style}
      source={
        failed
          ? {
              uri: "https://www.shutterstock.com/image-vector/box-icon-logo-modern-line-600nw-517561594.jpg",
            }
          : { uri }
      }
      onError={() => setFailed(true)}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    />
  );
};
