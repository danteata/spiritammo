import { useAuth as useClerkAuth } from '@clerk/clerk-expo'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { ReactNode } from 'react'

// Initialize Convex client
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!

if (!convexUrl) {
    console.warn('EXPO_PUBLIC_CONVEX_URL not set. Convex features will be disabled.')
}

// Create Convex client (will be null if URL not configured)
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

interface ConvexProviderProps {
    children: ReactNode
}

export function ConvexClientProvider({ children }: ConvexProviderProps) {
    if (!convex) {
        // Return children without Convex if URL not configured
        return <>{children}</>
    }

    return (
        <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
            {children}
        </ConvexProviderWithClerk>
    )
}

export { convex }
