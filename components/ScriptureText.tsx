import React from 'react';
import { Text, TextStyle } from 'react-native';
import { TACTICAL_THEME } from '@/constants/colors';

interface ScriptureTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

export default function ScriptureText({ 
  text, 
  style, 
  numberOfLines, 
  ellipsizeMode 
}: ScriptureTextProps) {
  // Check if text contains Words of Jesus markers
  const hasWordsOfJesus = text.includes('{{WJ_START}}') && text.includes('{{WJ_END}}');
  
  if (!hasWordsOfJesus) {
    // No Words of Jesus, render normally
    return (
      <Text 
        style={style} 
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
      >
        {text}
      </Text>
    );
  }
  
  // Split text by Words of Jesus markers
  const parts = text.split(/({{WJ_START}}.*?{{WJ_END}})/g);
  
  return (
    <Text 
      style={style} 
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {parts.map((part, index) => {
        if (part.startsWith('{{WJ_START}}') && part.endsWith('{{WJ_END}}')) {
          // This is Words of Jesus text
          const wordsOfJesus = part.replace('{{WJ_START}}', '').replace('{{WJ_END}}', '');
          return (
            <Text 
              key={index} 
              style={[
                style,
                { 
                  color: '#DC143C', // Crimson red for Words of Jesus
                  fontWeight: '500' // Slightly bolder
                }
              ]}
            >
              {wordsOfJesus}
            </Text>
          );
        } else {
          // Regular text
          return (
            <Text key={index} style={style}>
              {part}
            </Text>
          );
        }
      })}
    </Text>
  );
}
