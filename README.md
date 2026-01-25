# EcomGhosts Client Portal

A custom client portal for EcomGhosts to manage and display scheduled LinkedIn content for clients. Built with React and designed to match the EcomGhosts brand.

## 🎨 Features

### For Clients
- **Login Access**: Secure login to view assigned content
- **Calendar View**: Monthly calendar showing all scheduled posts and polls
- **Content Details**: Click any calendar item to view full content, time, and details
- **Visual Differentiation**: Posts (📝) and Polls (📊) have different icons and colors

### For Admins & Content Managers
- **Dashboard**: Overview of all scheduled content with statistics
- **Content Management**: Create, edit, and delete scheduled content
- **Client Assignment**: Assign specific content to individual clients
- **Full Calendar View**: See all content across all clients

## 🚀 Quick Start

### Local Testing

1. Open `index.html` in a web browser
2. Login with demo credentials:
   - **Client**: `client@example.com` / `demo`
   - **Admin**: `admin@ecomghosts.com` / `admin`
   - **Manager**: `manager@ecomghosts.com` / `manager`

### Deploy to portal.ecomghosts.com

#### Option 1: Static Hosting (Recommended for MVP)

**Using Netlify (Easiest)**
1. Create account at [netlify.com](https://netlify.com)
2. Drag and drop the `ecomghosts-portal` folder
3. Configure custom domain:
   - Go to Domain Settings
   - Add `portal.ecomghosts.com`
   - Update DNS records at your domain registrar:
     ```
     CNAME: portal.ecomghosts.com → [your-netlify-subdomain].netlify.app
     ```

**Using Vercel**
1. Install Vercel CLI: `npm install -g vercel`
2. Navigate to the portal folder
3. Run: `vercel`
4. Add custom domain in Vercel dashboard

**Using GitHub Pages**
1. Create a GitHub repository
2. Upload all portal files
3. Enable GitHub Pages in repository settings
4. Point `portal.ecomghosts.com` to your GitHub Pages URL

#### Option 2: Full Backend Integration

For production use with real authentication and database:

1. **Choose a Backend Solution**:
   - Firebase (recommended for quick setup)
   - Supabase (open-source alternative)
   - Custom Node.js/Express backend

2. **Required Backend Features**:
   - User authentication (email/password)
   - Database for users and content
   - API endpoints for CRUD operations
   - Role-based access control

3. **Integration Points in Code**:
   - Replace `MOCK_USERS` with real authentication API
   - Replace `MOCK_CONTENT` with database queries
   - Add API calls in form submissions

## 📁 File Structure

```
ecomghosts-portal/
├── index.html       # Main HTML file
├── styles.css       # EcomGhosts-themed styles
├── app.js           # React application logic
└── README.md        # This file
```

## 🎨 Design System

The portal uses the EcomGhosts brand colors:

- **Background**: `#0a0a0a` (primary), `#1a1a1a` (secondary)
- **Brand Orange**: `#ff6b3d`
- **Text**: `#ffffff` (primary), `#a0a0a0` (secondary)
- **Borders**: `#333333`

## 🔐 User Roles

### Client (View Only)
- See only content assigned to them
- View calendar and content details
- Cannot create or modify content

### Content Manager
- View all content across all clients
- Create and assign new content
- Edit and delete content
- Cannot manage users

### Admin (Full Control)
- All Content Manager permissions
- User management capabilities
- Full system access

## 📊 Content Types

### Post (📝)
- Standard LinkedIn post
- Orange accent color
- Fields: title, content, date, time

### Poll (📊)
- LinkedIn poll with options
- Blue accent color
- Fields: title, question, poll options, date, time

## 🔧 Customization

### Adding New Content Types

1. Update the content type in `MOCK_CONTENT`:
```javascript
{
    id: 6,
    type: 'video',  // new type
    title: 'Video Title',
    // ... other fields
}
```

2. Add icon and styling in the render logic:
```javascript
{item.type === 'post' ? '📝' : item.type === 'poll' ? '📊' : '🎥'}
```

3. Add corresponding CSS class in `styles.css`

### Modifying Colors

Edit CSS variables in `styles.css`:
```css
:root {
    --brand-orange: #ff6b3d;  /* Change brand color */
    --bg-primary: #0a0a0a;    /* Change background */
}
```

## 🔌 Backend Integration Guide

### Firebase Setup Example

1. **Install Firebase**:
```bash
npm install firebase
```

2. **Initialize Firebase**:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "portal.ecomghosts.com",
    projectId: "ecomghosts-portal"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
```

3. **Replace Mock Authentication**:
```javascript
// Replace handleLogin function
import { signInWithEmailAndPassword } from 'firebase/auth';

const handleLogin = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Fetch user role from Firestore
        // ...
    } catch (error) {
        setError(error.message);
    }
};
```

4. **Database Structure**:
```
users/
  {userId}/
    - email
    - name
    - role
    - clientId

content/
  {contentId}/
    - type
    - title
    - content
    - date
    - time
    - clientId
    - status
    - pollOptions (if poll)
```

## 📱 Responsive Design

The portal is fully responsive and works on:
- Desktop (1400px+)
- Tablet (768px - 1400px)
- Mobile (< 768px)

## 🐛 Troubleshooting

**Calendar not displaying correctly**
- Ensure browser supports ES6+ JavaScript
- Check browser console for errors

**Login not working**
- Verify demo credentials are correct
- Check localStorage is enabled in browser

**Styles not loading**
- Ensure all three files (HTML, CSS, JS) are in the same folder
- Check file paths are correct

## 🔒 Security Notes

⚠️ **Important**: The current version uses mock data and client-side authentication. For production:

1. Never store passwords in frontend code
2. Implement proper backend authentication
3. Use HTTPS for all connections
4. Validate all user inputs server-side
5. Implement rate limiting on API endpoints
6. Use JWT or session tokens for authentication
7. Enable CORS properly
8. Sanitize all user-generated content

## 📞 Support

For questions or issues with the portal:
- Email: admin@ecomghosts.com
- Documentation: This README file

## 🎯 Next Steps

1. **Test Locally**: Open `index.html` and test all features
2. **Deploy**: Choose a hosting option and deploy
3. **Configure DNS**: Point portal.ecomghosts.com to your hosting
4. **Add Backend**: Integrate with Firebase/Supabase for production
5. **Customize**: Adjust content types and fields as needed
6. **Train Team**: Show admins how to use the dashboard

## 📄 License

© 2026 EcomGhosts. All rights reserved.
