/**
 * One-time script to update scriptures with Words of Jesus highlighting
 * 
 * This script should be run once to update existing scripture data
 * with red-letter highlighting for Jesus's words.
 * 
 * Usage: Add this to a temporary button in the app or call from dev tools
 */

import { DataLoaderService } from '../services/dataLoader';

export const runWordsOfJesusUpdate = async () => {
  try {
    console.log('🔄 Starting Words of Jesus update...');
    
    const success = await DataLoaderService.updateWithWordsOfJesus();
    
    if (success) {
      console.log('✅ Words of Jesus update completed successfully!');
      console.log('📖 All scriptures now have red-letter highlighting for Jesus\'s words');
      return true;
    } else {
      console.log('❌ Words of Jesus update failed');
      return false;
    }
  } catch (error) {
    console.error('💥 Error during Words of Jesus update:', error);
    return false;
  }
};

// For manual execution in development
export const manualUpdate = () => {
  runWordsOfJesusUpdate().then(success => {
    if (success) {
      alert('✅ Words of Jesus update complete! Restart the app to see changes.');
    } else {
      alert('❌ Update failed. Check console for details.');
    }
  });
};

// Instructions for manual execution:
// 1. Import this file in a component
// 2. Call manualUpdate() from a button or useEffect
// 3. Remove the import after running once
//
// Example:
// import { manualUpdate } from '../scripts/updateWordsOfJesus';
// 
// // In component:
// useEffect(() => {
//   manualUpdate(); // Run once, then remove this line
// }, []);
