import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { BackGround } from "../component/background";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IconTickets,
  IconCard,
  IconTopArrow,
} from "../icon";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../config";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "../authContext";
import {
  formatDate,
  getStatusColor,
  getStatusIcon,
  getStatusText,
} from "../component/getStatus";

const TicketsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [filter, setFilter] = useState("completed");

  const fetchTickets = async () => {
    if (!user?.uid) return;

    try {
      const ticketsRef = collection(db, "tickets");
      const q = query(
        ticketsRef,
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const ticketsData = [];

      querySnapshot.forEach((doc) => {
        ticketsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setTickets(ticketsData);
    } catch (error) {
      console.log("Erreur lors de la récupération des tickets :", error);
      //   Alert.alert("Erreur", "Impossible de récupérer vos tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour rafraîchir la liste
  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  // Filtrer les tickets selon le statut
  const getFilteredTickets = () => {
    if (filter === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === filter);
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.uid]);

  return (
    <View style={{ flex: 1 }}>
      <BackGround middle={true} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 15 }}
          accessible={true}
          accessibilityLabel="Retour à l'écran précédent"
          accessibilityRole="button"
        >
          <IconTopArrow />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            flex: 1,
            textAlign: "center",
          }}
          accessible={true}
          accessibilityRole="header"
        >
          Mes Tickets
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filtres */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
        }}
        accessible={true}
        accessibilityLabel="Filtres des tickets"
        accessibilityRole="tabbar"
      >
        {[
          { key: "completed", label: "Terminés" },
          { key: "cancelled", label: "Annulés" },
        ].map((filterOption) => (
          <TouchableOpacity
            key={filterOption.key}
            onPress={() => setFilter(filterOption.key)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor:
                filter === filterOption.key ? "#007bff" : "white",
              borderRadius: 20,
              marginRight: 10,
              shadowOpacity: 0.3,
              shadowRadius: 2,
              shadowOffset: { height: 1, width: 0 },
            }}
            accessible={true}
            accessibilityLabel={`Filtrer par tickets ${filterOption.label.toLowerCase()}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === filterOption.key }}
          >
            <Text
              style={{
                color: filter === filterOption.key ? "white" : "black",
                fontWeight: filter === filterOption.key ? "bold" : "normal",
              }}
              accessible={false}
            >
              {filterOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text 
            accessible={true}
            accessibilityLabel="Chargement de vos tickets en cours"
          >
            Chargement de vos tickets...
          </Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredTickets()}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              accessible={true}
              accessibilityLabel="Actualiser la liste des tickets"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          accessible={true}
          accessibilityLabel={`Liste des tickets ${getStatusText(filter).toLowerCase()}`}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 100,
              }}
            >
              <IconTickets />
              <Text 
                style={{ marginTop: 20, fontSize: 16, color: "#666" }}
                accessible={true}
                accessibilityLabel={
                  filter === "all"
                    ? "Aucun ticket trouvé"
                    : `Aucun ticket ${getStatusText(filter).toLowerCase()}`
                }
              >
                {filter === "all"
                  ? "Aucun ticket trouvé"
                  : `Aucun ticket ${getStatusText(filter).toLowerCase()}`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setSelectedTicket(item);
                setIsDetailModalVisible(true);
              }}
              style={{
                backgroundColor: "white",
                borderRadius: 15,
                padding: 20,
                marginTop: 15,
                shadowOpacity: 0.5,
                shadowRadius: 5,
                shadowOffset: { height: 2, width: 0 },
              }}
              accessible={true}
              accessibilityLabel={`Ticket numéro ${item.id.substring(0, 8)}, ${item.storeName || "Magasin inconnu"}, ${getStatusText(item.status)}, montant ${item.totalAmount} euros, créé le ${formatDate(item.createdAt)}`}
              accessibilityRole="button"
              accessibilityHint="Appuyez pour voir les détails du ticket"
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                accessible={false}
              >
                <View style={{ flex: 1 }} accessible={false}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      marginBottom: 5,
                    }}
                    accessible={false}
                  >
                    Ticket #{item.id.substring(0, 8)}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#666", marginBottom: 5 }}
                    accessible={false}
                  >
                    {item.storeName || "Magasin inconnu"}
                  </Text>
                  <Text 
                    style={{ fontSize: 12, color: "#999" }}
                    accessible={false}
                  >
                    {formatDate(item.createdAt)}
                  </Text>
                </View>

                <View style={{ alignItems: "center" }} accessible={false}>
                  <View
                    style={{
                      backgroundColor: getStatusColor(item.status),
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 15,
                      marginBottom: 5,
                    }}
                    accessible={false}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                      accessible={false}
                    >
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                  <Text 
                    style={{ fontSize: 14, fontWeight: "bold" }}
                    accessible={false}
                  >
                    {item.totalAmount + "€"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal détail du ticket */}
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        transparent={true}
        accessible={true}
        accessibilityViewIsModal={true}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          accessible={true}
          accessibilityLabel="Détail du ticket"
        >
          <View
            style={{
              backgroundColor: "white",
              width: "90%",
              maxHeight: "80%",
              borderRadius: 15,
              padding: 20,
            }}
            accessible={false}
          >
            {selectedTicket && (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                  accessible={false}
                >
                  <Text 
                    style={{ fontSize: 18, fontWeight: "bold" }}
                    accessible={true}
                    accessibilityRole="header"
                  >
                    Détail du Ticket
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsDetailModalVisible(false)}
                    accessible={true}
                    accessibilityLabel="Fermer les détails du ticket"
                    accessibilityRole="button"
                  >
                    <Text 
                      style={{ fontSize: 16, color: "#007bff" }}
                      accessible={false}
                    >
                      Fermer
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  accessible={true}
                  accessibilityLabel="Détails du ticket"
                >
                  <TicketDetailItem
                    icon={<IconTickets />}
                    label="Numéro"
                    value={`#${selectedTicket.id.substring(0, 8)}`}
                  />
                  <TicketDetailItem
                    icon={<IconCard />}
                    label="Date"
                    value={formatDate(selectedTicket.createdAt)}
                  />
                  <TicketDetailItem
                    icon={getStatusIcon(selectedTicket.status)}
                    label="Statut"
                    value={getStatusText(selectedTicket.status)}
                    valueColor={getStatusColor(selectedTicket.status)}
                  />
                  <TicketDetailItem
                    icon={<IconCard />}
                    label="Montant"
                    value={
                      selectedTicket.totalAmount
                        ? `${selectedTicket.totalAmount}€`
                        : "N/A"
                    }
                  />

                  {selectedTicket.storeName && (
                    <TicketDetailItem
                      icon={null}
                      label="Magasin"
                      value={selectedTicket.storeName}
                    />
                  )}

                  {selectedTicket.items && selectedTicket.items.length > 0 && (
                    <View 
                      style={{ marginTop: 20 }}
                      accessible={true}
                      accessibilityLabel={`Liste des articles, ${selectedTicket.items.length} article${selectedTicket.items.length > 1 ? 's' : ''}`}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          marginBottom: 10,
                        }}
                        accessible={false}
                      >
                        Articles ({selectedTicket.items.length})
                      </Text>
                      {selectedTicket.items.map((item, index) => (
                        <View
                          key={index}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 5,
                            borderBottomWidth:
                              index < selectedTicket.items.length - 1 ? 1 : 0,
                            borderBottomColor: "#eee",
                          }}
                          accessible={true}
                          accessibilityLabel={`${item.name || "Article"}, quantité ${item.quantity || 1}, prix ${item.price ? `${item.price} euros` : "non disponible"}`}
                        >
                          <Text 
                            style={{ flex: 1 }}
                            accessible={false}
                          >
                            {item.name || "Article"}
                          </Text>
                          <Text accessible={false}>x{item.quantity || 1}</Text>
                          <Text 
                            style={{ marginLeft: 10, fontWeight: "bold" }}
                            accessible={false}
                          >
                            {item.price ? `${item.price}€` : "N/A"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Composant pour les détails du ticket
const TicketDetailItem = ({ icon, label, value, valueColor = "black" }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
      }}
      accessible={true}
      accessibilityLabel={`${label}: ${value}`}
    >
      {icon && (
        <>
          <View accessible={false}>
            {icon}
          </View>
          <View style={{ width: 15 }} />
        </>
      )}
      <View style={{ flex: 1 }} accessible={false}>
        <Text 
          style={{ fontSize: 12, color: "#666", marginBottom: 2 }}
          accessible={false}
        >
          {label}
        </Text>
        <Text 
          style={{ fontSize: 16, fontWeight: "500", color: valueColor }}
          accessible={false}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

export default TicketsScreen;