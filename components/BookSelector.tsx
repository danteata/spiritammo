import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Book } from '@/types/scripture';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface BookSelectorProps {
  onSelectBook: (book: Book) => void;
}

export default function BookSelector({ onSelectBook }: BookSelectorProps) {
  const { books, selectedBook, isDark } = useAppStore();
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleSelect = (book: Book) => {
    onSelectBook(book);
    setModalVisible(false);
  };
  
  const renderItem = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => handleSelect(item)}
      testID={`book-item-${item.id}`}
    >
      <Text style={[
        styles.bookItemText, 
        { color: isDark ? COLORS.text.dark : COLORS.text.light }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
  
  const backgroundColor = isDark ? COLORS.background.dark : COLORS.background.light;
  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.selector,
          { backgroundColor: isDark ? COLORS.surface.dark : COLORS.surface.light,
            borderColor }
        ]}
        onPress={() => setModalVisible(true)}
        testID="book-selector-button"
      >
        <Text style={[styles.selectorText, { color: textColor }]}>
          {selectedBook ? selectedBook.name : 'Choose your weapon'}
        </Text>
        <ChevronDown size={20} color={textColor} />
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Select Book
            </Text>
            
            <FlatList
              data={books}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.bookList}
            />
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: COLORS.primary.main }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bookList: {
    width: '100%',
  },
  bookItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  bookItemText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});