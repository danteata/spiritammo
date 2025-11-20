import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface PDFExtractorProps {
  fileUri: string;
  onExtractionComplete: (text: string) => void;
  onError: (error: string) => void;
}

export const PDFExtractor: React.FC<PDFExtractorProps> = ({
  fileUri,
  onExtractionComplete,
  onError,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [scriptInjected, setScriptInjected] = useState(false);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      try {
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setFileContent(base64);
      } catch (err) {
        onError(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    if (fileUri) {
      loadFile();
    }
  }, [fileUri]);

  useEffect(() => {
    if (webViewLoaded && fileContent && webViewRef.current && !scriptInjected) {
      // Simulate progress updates while extraction runs
      const progressInterval = setInterval(() => {
        const messages = [
          'ESTABLISHING SECURE CONNECTION...',
          'SCANNING DOCUMENT SECTORS...',
          'DECRYPTING INTEL...',
          'IDENTIFYING TARGETS...',
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        // Send log message which can be interpreted as progress
        // Note: We can't easily send a real "progress" event from here to the parent 
        // without changing the interface, but we can use the onError channel 
        // or just rely on the parent showing a spinner. 
        // Ideally, we should update the interface, but for now let's keep it simple.
      }, 2000);

      const script = `
        setTimeout(() => {
          if (window.extractPdfContent) {
            window.extractPdfContent("${fileContent}");
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'PDF extraction function not found' }));
          }
        }, 500);
        true;
      `;
      webViewRef.current.injectJavaScript(script);
      setScriptInjected(true);

      return () => clearInterval(progressInterval);
    }
  }, [webViewLoaded, fileContent, scriptInjected]);

  // HTML content with PDF.js (using CDN for now)
  // We use version 3.11.174 which is stable
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <script>
          // Set worker source
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          window.extractPdfContent = async function(base64Data) {
            try {
              // Decode base64
              const binaryString = atob(base64Data);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Load document
              const loadingTask = pdfjsLib.getDocument({ data: bytes });
              const pdf = await loadingTask.promise;
              
              let fullText = '';
              const numPages = pdf.numPages;

              for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\\n\\n';
              }

              // Send back to React Native
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', text: fullText }));
            } catch (error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: error.message }));
            }
          };
        </script>
      </head>
      <body>
        <h1>PDF Extractor</h1>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'success') {
              onExtractionComplete(data.text);
            } else if (data.type === 'error') {
              onError(data.message);
            } else if (data.type === 'log') {
              console.log('WebView Log:', data.message);
            }
          } catch (e) {
            onError('Failed to parse WebView message');
          }
        }}
        onLoadEnd={() => setWebViewLoaded(true)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 0,
    width: 0,
    position: 'absolute',
    opacity: 0,
  },
});
