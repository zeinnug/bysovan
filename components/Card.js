import { View, Text, StyleSheet, SafeAreaView } from "react-native";

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>HomeScreen</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  }
});

export default HomeScreen;