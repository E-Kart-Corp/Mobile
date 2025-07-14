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
  //   IconArrowLeft,
  //   IconCalendar,
  IconCard,
  IconTopArrow,
  //   IconCheck,
  //   IconClock,
  //   IconCancel,
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
          >
            <Text
              style={{
                color: filter === filterOption.key ? "white" : "black",
                fontWeight: filter === filterOption.key ? "bold" : "normal",
              }}
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
          <Text>Chargement de vos tickets...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredTickets()}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
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
              <Text style={{ marginTop: 20, fontSize: 16, color: "#666" }}>
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
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      marginBottom: 5,
                    }}
                  >
                    Ticket #{item.id.substring(0, 8)}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#666", marginBottom: 5 }}
                  >
                    {item.storeName || "Magasin inconnu"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999" }}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>

                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: getStatusColor(item.status),
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 15,
                      marginBottom: 5,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "bold" }}>
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
            style={{
              backgroundColor: "white",
              width: "90%",
              maxHeight: "80%",
              borderRadius: 15,
              padding: 20,
            }}
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
                >
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                    Détail du Ticket
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsDetailModalVisible(false)}
                  >
                    <Text style={{ fontSize: 16, color: "#007bff" }}>
                      Fermer
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
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
                    <View style={{ marginTop: 20 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          marginBottom: 10,
                        }}
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
                        >
                          <Text style={{ flex: 1 }}>
                            {item.name || "Article"}
                          </Text>
                          <Text>x{item.quantity || 1}</Text>
                          <Text style={{ marginLeft: 10, fontWeight: "bold" }}>
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
    >
      {icon && (
        <>
          {icon}
          <View style={{ width: 15 }} />
        </>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "500", color: valueColor }}>
          {value}
        </Text>
      </View>
    </View>
  );
};

export default TicketsScreen;
