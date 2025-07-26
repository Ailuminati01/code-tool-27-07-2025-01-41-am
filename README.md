# S.P.A.R.K. - Secure Police Archival & Record Keeper

**S.P.A.R.K.** is an advanced document management system specifically designed for the Andhra Pradesh Police Department. It leverages cutting-edge AI technologies including Azure AI Document Intelligence and OpenAI for intelligent document processing, field extraction, and template-based data management.

## 🚀 Features

### Core Functionality
- **Intelligent Document Processing**: Azure AI-powered OCR and document analysis
- **AI Template Matching**: OpenAI-based automatic template detection and field mapping
- **Multi-format Support**: PDF, JPEG, PNG, TIFF document processing
- **Real-time Preview**: Enhanced PDF and image preview capabilities
- **Template Management**: Create, edit, and manage custom document templates
- **Secure Storage**: Dual storage with IndexedDB (local) and Supabase (cloud)
- **Audit Logging**: Comprehensive security audit trails
- **Role-based Access**: Clerk and Admin user roles with appropriate permissions

### Document Types Supported
1. **Earned Leave Letter** - Employee leave applications
2. **Medical Leave Letter** - Health-related leave requests
3. **Probation Letter** - Employee probation documentation
4. **Punishment Letter** - Disciplinary action records
5. **Reward Letter** - Recognition and award documentation

### Advanced Features
- **Mobile QR Upload**: Generate QR codes for mobile document uploads
- **Batch Processing**: Handle multiple documents efficiently
- **Data Encryption**: Sensitive field encryption for security
- **Export Capabilities**: JSON export for documents and templates
- **Analytics Dashboard**: Document processing statistics and insights
- **Search & Filter**: Advanced document search and filtering options

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling

### Backend Services
- **Azure AI Document Intelligence** - OCR and document analysis
- **OpenAI GPT-4** - Template matching and field extraction
- **Supabase** - Cloud database and real-time features
- **IndexedDB** - Local browser storage

### Security & Storage
- **Dexie** - IndexedDB wrapper for local storage
- **CryptoJS** - Client-side encryption
- **Row Level Security** - Supabase RLS policies
- **Audit Logging** - Comprehensive activity tracking

## 📋 Prerequisites

Before installing S.P.A.R.K., ensure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Azure AI Services** account
- **OpenAI API** account
- **Supabase** project (optional but recommended)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd spark-document-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration (Optional but recommended)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Azure AI Services (Required for document processing)
VITE_AZURE_AI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
VITE_AZURE_AI_KEY=your-azure-ai-key

# OpenAI Configuration (Required for template matching)
VITE_OPENAI_API_KEY=your-openai-api-key
```

### 4. Database Setup (Supabase)

If using Supabase for cloud storage:

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to the `.env` file
3. Run the database migrations:

```bash
# The migrations will be automatically applied when you first run the app
# Or you can apply them manually in the Supabase SQL editor
```

## 🚀 Getting Started

### 1. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 2. Default Login Credentials

The system comes with demo credentials:

**Clerk Users:**
- Username: `clerk1` / Password: `password123`
- Username: `clerk2` / Password: `password123`

**Admin User:**
- Username: `admin1` / Password: `password123`

### 3. First-Time Setup

1. **Service Health Check**: The dashboard will show the status of Azure AI, OpenAI, and Supabase services
2. **Template Initialization**: Default templates will be automatically loaded
3. **Test Upload**: Try uploading a sample document to verify the processing pipeline

## 🔑 API Keys Setup

### Azure AI Document Intelligence

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a "Cognitive Services" resource
3. Select "Document Intelligence" service
4. Copy the endpoint and key to your `.env` file

### OpenAI API

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create an API key in your account settings
3. Add the key to your `.env` file

### Supabase (Optional)

1. Create a project at [Supabase](https://supabase.com)
2. Go to Settings > API
3. Copy the URL and anon key to your `.env` file

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── Admin/           # Admin-specific components
│   ├── Analytics/       # Dashboard and analytics
│   ├── Auth/           # Authentication components
│   ├── Documents/      # Document processing UI
│   ├── Layout/         # Layout components
│   ├── Mobile/         # Mobile-specific features
│   └── Security/       # Security and audit components
├── contexts/           # React contexts
├── services/           # API and service layers
├── types/             # TypeScript type definitions
└── utils/             # Utility functions

supabase/
└── migrations/        # Database migration files
```

## 🔒 Security Features

### Data Protection
- **Field-level Encryption**: Sensitive data encrypted before storage
- **Row Level Security**: Supabase RLS policies for data access control
- **Audit Logging**: All user actions tracked and logged
- **Session Management**: Secure session handling

### Access Control
- **Role-based Permissions**: Clerk and Admin roles with specific capabilities
- **Resource-level Security**: Fine-grained access to documents and templates
- **IP and User Agent Tracking**: Security monitoring

## 📊 Usage Guide

### For Clerks

1. **Upload Documents**: Use the upload interface to process documents
2. **Review Extractions**: Verify AI-extracted data before approval
3. **Manage Records**: View and search processed documents
4. **Mobile Upload**: Generate QR codes for mobile document capture

### For Administrators

1. **User Management**: Create and manage user accounts
2. **Template Management**: Create and modify document templates
3. **Analytics**: View processing statistics and system health
4. **Audit Logs**: Monitor system activity and security events
5. **System Configuration**: Manage service connections and settings

## 🔧 Configuration

### Template Customization

Templates can be customized through the admin interface:

1. Navigate to "Templates" in the admin panel
2. Create new templates or modify existing ones
3. Define field types, validation rules, and requirements
4. Export/import templates for backup or sharing

### Service Configuration

Monitor and configure services through the upload interface:

1. **Azure AI Status**: Check OCR service connectivity
2. **OpenAI Status**: Verify template matching capabilities
3. **Supabase Status**: Monitor database connectivity
4. **Manual Sync**: Force synchronization between local and cloud storage

## 🚨 Troubleshooting

### Common Issues

**Service Connection Errors:**
- Verify API keys in `.env` file
- Check network connectivity
- Ensure service quotas are not exceeded

**Database Issues:**
- Verify Supabase credentials
- Check RLS policies are correctly configured
- Ensure migrations have been applied

**Upload Failures:**
- Check file format support (PDF, JPEG, PNG, TIFF)
- Verify file size limits (50MB max)
- Ensure Azure AI service is responding

### Debug Mode

Enable debug logging by setting:
```env
VITE_DEBUG=true
```

## 📈 Performance Optimization

### Local Storage
- IndexedDB provides offline capability
- Automatic cleanup of temporary documents
- Efficient caching of templates and user data

### Cloud Sync
- Automatic synchronization with Supabase
- Fallback to local storage if cloud is unavailable
- Batch operations for improved performance

## 🔄 Backup and Recovery

### Data Export
- Export documents and templates as JSON
- Automated backup creation for critical operations
- Version control for template changes

### Recovery Procedures
- Local data recovery from IndexedDB
- Cloud data restoration from Supabase
- Template restoration from exports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software developed for the Andhra Pradesh Police Department.

## 📞 Support

For technical support or questions:
- Check the troubleshooting section
- Review the audit logs for error details
- Contact the development team with specific error messages

## 🔮 Future Enhancements

- **Multi-language Support**: Regional language processing
- **Advanced Analytics**: Machine learning insights
- **Workflow Automation**: Automated document routing
- **Integration APIs**: Third-party system integration
- **Mobile App**: Native mobile application

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Developed for**: Andhra Pradesh Police Department