import { TouchableOpacity, View, Text, Dimensions } from "react-native";
import { Path, Svg } from "react-native-svg";
import { IconTopArrow } from "../icon";

const screenWidth = Dimensions.get("window").width;

export const ButtonOpenModal = ({ setModalVisible, basket }) => {
  const totalAmount = basket.reduce((sum, item) => {
    const price = parseFloat(item?.price);
    const quantity = item?.quantity || 1;
    if (!isNaN(price)) {
      return sum + price * quantity;
    }
    return sum;
  }, 0);

  const validBasketLength = basket.filter(
    item =>
      typeof item?.price === 'number' &&
      !isNaN(item.price) &&
      item.product_name
  ).length;

  // Création du message d'accessibilité
  const accessibilityLabel = `Panier contenant ${validBasketLength} article${validBasketLength > 1 ? 's' : ''}, total ${totalAmount.toFixed(2)} euros. Auto-paiement à la sortie. Appuyez pour ouvrir le panier.`;

  return (
    <TouchableOpacity
      onPress={() => setModalVisible(true)}
      style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
        alignItems: "center",
      }}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint="Ouvre la modal du panier pour voir le détail de vos achats"
    >
      <Svg 
        height="110" 
        width={screenWidth}
        accessible={false}
      >
        <Path
          d={`M0 50 Q${screenWidth / 2} -40 ${screenWidth} 50 L${screenWidth} 110 L0 110 Z`}
          fill="white"
        />
      </Svg>
      
      <View 
        style={{ position: "absolute", top: 20, alignItems: "center" }}
        accessible={false}
      >
        <View accessible={false}>
          <IconTopArrow />
        </View>
        
        <Text 
          style={{ fontSize: 10 }}
          accessible={false}
        >
          Votre panier contient {validBasketLength} article
          {validBasketLength > 1 ? "s" : ""}
        </Text>
        
        <Text 
          style={{ fontSize: 25 }}
          accessible={false}
        >
          {totalAmount.toFixed(2)}€
        </Text>
        
        <Text 
          style={{ fontSize: 10, color: "#FF3333", marginBottom: 10 }}
          accessible={false}
        >
          Auto-paiement à la sortie
        </Text>
      </View>
    </TouchableOpacity>
  );
};