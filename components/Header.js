import { Text, View } from "react-native";
const Header = ({ headerText, flexPosition }) => {
 const flexPositionStyle = flexPosition ? flexPosition : "center";
 return (
 <View
 style={{
 flexDirection: "row",
 justifyContent: flexPositionStyle,
 backgroundColor: "white",
 alignItems: "center",
 marginBottom: 16,
 marginTop: 32,
 }}
 >
 <Text style={{ marginRight: 8, fontSize: 18, fontWeight: "600"
}}>
 {headerText}
 </Text>
 </View>
 );
};
export default Header;