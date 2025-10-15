# MyRotaPro Frontend

A modern React TypeScript frontend for the MyRotaPro rota management system, built with Vite and Tailwind CSS.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **TypeScript**: Full type safety and better development experience
- **Real-time Updates**: Live rota changes and notifications
- **Drag & Drop**: Intuitive shift assignment interface
- **AI Integration**: AI-powered rota generation and optimization
- **Mobile Responsive**: Works seamlessly on all devices
- **Role-based Access**: Different interfaces for different user roles
- **CI/CD Pipeline**: Automated Docker builds with GitHub Actions 🚀

## 🏗️ Architecture

```
MyRotaProReact/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and API client
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Helper functions
│   └── App.tsx        # Main application component
├── public/            # Static assets
├── index.html         # HTML entry point
└── package.json       # Dependencies and scripts
```

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **UI Components**: Headless UI + Heroicons
- **Notifications**: React Hot Toast
- **Charts**: Recharts
- **Drag & Drop**: React Beautiful DnD

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running (see MyRotaProNode)

## 🚀 Installation

1. **Navigate to the frontend directory**
   ```bash
   cd MyRotaProReact
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## ⚙️ Configuration

The frontend is configured to proxy API requests to the backend at `http://localhost:5000`. This is configured in `vite.config.ts`.

If you need to change the backend URL, update the proxy configuration:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend-url:5000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

## 🎨 UI Components

### Button Component
```tsx
import Button from '@/components/ui/Button'

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

### Form Components
```tsx
import { Input, Select, Textarea } from '@/components/ui/Form'

<Input
  name="email"
  label="Email"
  type="email"
  required
  placeholder="Enter your email"
/>
```

### Card Components
```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## 🔐 Authentication

The app uses JWT tokens for authentication. The `useAuth` hook provides:

- User login/logout
- User registration
- Current user information
- Permission checking
- Automatic token management

```tsx
import { useAuth, usePermissions } from '@/hooks/useAuth'

function MyComponent() {
  const { user, logout } = useAuth()
  const { canManageRotas, isAdmin } = usePermissions()
  
  // Use user data and permissions
}
```

## 📡 API Integration

The app uses React Query for API state management. API calls are organized in the `lib/api.ts` file:

```tsx
import { useQuery, useMutation } from '@tanstack/react-query'
import { rotasApi } from '@/lib/api'

// Fetch rotas
const { data: rotas, isLoading } = useQuery({
  queryKey: ['rotas', homeId],
  queryFn: () => rotasApi.getAll({ home_id: homeId })
})

// Create rota
const createRotaMutation = useMutation({
  mutationFn: rotasApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['rotas'] })
  }
})
```

## 🎯 Key Pages

### Dashboard
- Overview of current week's rota
- Quick actions and statistics
- Recent activity feed

### Rota Editor
- Weekly rota view with drag & drop
- Shift creation and editing
- Staff assignment interface
- AI-powered rota generation

### Staff Management
- User list and management
- Role assignment
- Skills and preferences

### Settings
- User profile management
- System preferences
- Constraint weights for AI solver

## 🎨 Styling

The app uses Tailwind CSS with custom component classes. Key styling patterns:

```css
/* Custom button variants */
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
.btn-secondary { @apply bg-secondary-100 text-secondary-900 hover:bg-secondary-200; }

/* Custom card styles */
.card { @apply rounded-lg border bg-white shadow-sm; }
.card-header { @apply flex flex-col space-y-1.5 p-6; }

/* Custom animations */
.animate-fade-in { @apply animate-fadeIn 0.5s ease-in-out; }
.animate-slide-up { @apply animate-slideUp 0.3s ease-out; }
```

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Adding New Features
1. **Create types** in `src/types/index.ts`
2. **Add API endpoints** in `src/lib/api.ts`
3. **Create components** in `src/components/`
4. **Add pages** in `src/pages/`
5. **Update routing** in `src/App.tsx`

### Code Style
- Use TypeScript for all components
- Follow React best practices
- Use Tailwind CSS for styling
- Implement proper error handling
- Add loading states for async operations

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Preview the build
npm run preview

# Deploy the dist/ folder to your hosting service
```

### Environment Variables
Create a `.env` file for production:

```env
VITE_API_URL=https://your-api-domain.com
VITE_APP_NAME=MyRotaPro
```

## 📱 Mobile Support

The app is fully responsive and includes:

- Touch-friendly interfaces
- Mobile-optimized layouts
- Responsive navigation
- Touch gestures for drag & drop

## 🔮 Future Enhancements

- **Real-time Updates**: WebSocket integration
- **Offline Support**: Service worker and PWA features
- **Advanced Analytics**: Detailed reporting and insights
- **Mobile App**: React Native version
- **Dark Mode**: Theme switching
- **Internationalization**: Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the component documentation
- Review the TypeScript types
- Check the API integration
- Verify the backend connection

## 🔗 Related Projects

- **Backend**: [MyRotaProNode](../MyRotaProNode) - Node.js backend API
- **Database**: MongoDB with Mongoose ODM
- **AI Solver**: Custom constraint optimization algorithm
# Trigger rebuild Wed Oct 15 06:37:13 PM BST 2025
# Testing Docker Hub secrets - Wed Oct 15 06:59:15 PM BST 2025
