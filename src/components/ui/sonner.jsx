import { Toaster as HotToaster } from "react-hot-toast"

// Replaced sonner with react-hot-toast to avoid stale Vite pre-bundle conflict
const Toaster = ({ ...props }) => {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: {
            primary: '#8B5CF6',
            secondary: '#ffffff',
          },
        },
      }}
      {...props}
    />
  );
}

export { Toaster }