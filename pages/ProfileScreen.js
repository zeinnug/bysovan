import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const ProfileScreen = ({ userData, onLogout }) => {
  const user = userData || {
    name: 'User',
    email: 'user@example.com',
    role: 'Admin'
  };

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        {
          text: 'Batal',
          style: 'cancel'
        },
        {
          text: 'Ya, Keluar',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Informasi Akun',
      icon: 'person',
      items: [
        { label: 'Nama', value: user.name || user.username || 'N/A' },
        { label: 'Email', value: user.email || 'N/A' },
        { label: 'Role', value: user.role || 'Admin' },
      ]
    },
    {
      title: 'Pengaturan',
      icon: 'gear',
      action: () => Alert.alert('Info', 'Fitur pengaturan akan segera hadir')
    },
    {
      title: 'Bantuan & Dukungan',
      icon: 'question',
      action: () => Alert.alert('Bantuan', 'Hubungi admin untuk bantuan: admin@sepatubysovan.com')
    },
    {
      title: 'Tentang Aplikasi',
      icon: 'info',
      action: () => Alert.alert(
        'SepatuBySovan v1.0.0',
        'Sistem Manajemen Toko Sepatu Modern\n\n© 2025 SepatuBySovan\nAll rights reserved.'
      )
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFIL</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Octicons name="person" size={48} color="#FC6A0A" />
            </View>
            <View style={styles.statusBadge}>
              <Octicons name="check" size={12} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.userName}>{user.name || user.username || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role || 'Admin'}</Text>
          </View>
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Octicons name={section.icon} size={20} color="#FC6A0A" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.items ? (
              // Info items
              <View style={styles.infoCard}>
                {section.items.map((item, itemIndex) => (
                  <View 
                    key={itemIndex} 
                    style={[
                      styles.infoRow,
                      itemIndex < section.items.length - 1 && styles.infoRowBorder
                    ]}
                  >
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              // Action item
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={section.action}
              >
                <Text style={styles.actionText}>{section.title}</Text>
                <Octicons name="chevron-right" size={20} color="#585757" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Octicons name="sign-out" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5ECE4',
  },
  header: {
    backgroundColor: '#292929',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5ECE4',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#585757',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5ECE4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FC6A0A',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#FC6A0A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#292929',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#585757',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE4',
  },
  infoLabel: {
    fontSize: 14,
    color: '#585757',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#292929',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#585757',
  },
  actionText: {
    fontSize: 14,
    color: '#292929',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#E74504',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#E74504',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#585757',
    marginTop: 20,
  },
});

export default ProfileScreen;