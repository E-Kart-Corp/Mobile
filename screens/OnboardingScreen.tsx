import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  Linking,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginScreenNavigationProp } from "./authStack/LoginScreen";
import { ONBOARDING_STORAGE_KEY } from "../storageKeys";
import { useAccessibility } from "../accessibilityContext";

type OnboardingRouteProp = RouteProp<
  { Onboarding: { replay?: boolean } },
  "Onboarding"
>;

const slides = [
  {
    id: "1",
    icon: "cart" as const,
    title: "Bienvenue sur E-Kart",
    description:
      "Faites vos courses en toute simplicité en scannant vos produits. Plus besoin de faire la queue à la caisse.",
  },
  /* {
    id: "2",
    icon: "qr-code" as const,
    title: "Connectez-vous au magasin",
    description:
      "Scannez le QR code à l'entrée du commerce pour vous connecter.",
  }, */
  {
    id: "3",
    icon: "camera" as const,
    title: "Scannez vos produits",
    description:
      "Prenez une photo du produit avec la caméra. Notre intelligence artificielle identifie le produit et l'ajoute automatiquement à votre panier. M",
  },
  {
    id: "4",
    icon: "list" as const,
    title: "Gérez votre panier",
    description:
      "Appuyez sur le bouton panier en bas de l'écran pour voir vos articles, modifier les quantités, supprimer un produit, payer par carte ou abandonner le panier.",
  },
  {
    id: "5",
    icon: "person" as const,
    title: "Profil et paramètres",
    description:
      "Accédez à votre profil, vos tickets d'achat et les réglages (sons, vibrations, mode daltonien) depuis l'icône en haut à droite de l'écran.",
  },
  {
    id: "6",
    icon: "checkmark-circle" as const,
    title: "C'est parti !",
    description:
      "Vous êtes prêt à faire vos courses. Pensez à scanner le QR code du magasin si vous êtes en magasin physique.",
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const route = useRoute<OnboardingRouteProp>();
  const { announce, triggerFeedback, shouldReduceMotion } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);

  const isReplay = route.params?.replay === true;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const slide = slides[currentIndex];
    announce(
      `Étape ${currentIndex + 1} sur ${slides.length}, ${slide.title}. ${slide.description}`,
    );
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number }[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    triggerFeedback("selection");
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: !shouldReduceMotion,
      });
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    triggerFeedback("selection");
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: !shouldReduceMotion,
      });
    }
  };

  const handleComplete = async () => {
    if (!isReplay) {
      try {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      } catch (e) {
        console.warn("Onboarding: failed to persist completion", e);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: "TabStack" }],
      });
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    triggerFeedback("selection");

    Alert.alert(
      "‼️ Attention ‼️",
      "Cette application est en cours de développement. Elle n'est pas encore disponible en production. Et que toutes les données sont a titre d'exemple.",
      [{ text: "Fermer", style: "cancel" }],
    );
    handleComplete();
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={72} color="#007A5E" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const isLast = currentIndex === slides.length - 1;

  useEffect(() => {
    if (currentIndex === slides.length - 1) {
      Alert.alert(
        "Attention ‼️",
        "Cette application est en cours de développement. Elle n'est pas encore disponible en production. Et que toutes les données sont a titre d'exemple.",
        [{ text: "Fermer", style: "cancel" }],
      );
    }
  }, [isLast]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <TouchableOpacity
        onPress={handleSkip}
        style={[styles.skipButton, { top: insets.top + 8 }]}
        accessible={true}
        accessibilityLabel="Passer le tutoriel"
        accessibilityHint="Ferme le tutoriel et accède à l'application"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        bounces={false}
        accessible={true}
        accessibilityLabel="Tutoriel de présentation. Faites glisser pour changer d'étape."
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {currentIndex > 0 ? (
            <TouchableOpacity
              onPress={handlePrev}
              style={styles.secondaryButton}
              accessible={true}
              accessibilityLabel="Étape précédente"
              accessibilityHint="Revenir à l'étape précédente du tutoriel"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={22} color="#007A5E" />
              <Text style={styles.secondaryButtonText}>Précédent</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.primaryButton,
              currentIndex === 0 && styles.primaryButtonFullWidth,
            ]}
            accessible={true}
            accessibilityLabel={
              isLast ? (isReplay ? "Fermer" : "Commencer") : "Étape suivante"
            }
            accessibilityHint={
              isLast ? "Terminer le tutoriel" : "Passer à l'étape suivante"
            }
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>
              {isLast
                ? isReplay
                  ? "J'ai compris"
                  : "C'est parti !"
                : "Suivant"}
            </Text>
            {!isLast && (
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  skipButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    fontSize: 16,
    color: "#007A5E",
    fontWeight: "600",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0, 122, 94, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#007A5E",
    width: 24,
  },
  dotInactive: {
    backgroundColor: "#ccc",
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007A5E",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryButtonFullWidth: {
    width: "100%",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  secondaryButtonText: {
    color: "#007A5E",
    fontSize: 16,
    fontWeight: "500",
  },
});
