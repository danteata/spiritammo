/// <reference types="jest" />

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidRecording(): R;
            toHaveValidFileUri(): R;
        }
    }

    namespace NodeJS {
        interface Global {
            testUtils: {
                createMockRecording: (overrides?: any) => any;
                createMockFileInfo: (exists?: boolean, overrides?: any) => any;
                mockAsyncStorage: (initialData?: any) => any;
            };
        }
    }
}

export { }
