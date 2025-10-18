# 📋 Deployment & Testing Documentation

## 🌐 Deployment Status

**Production URL:** https://pindahan-app.jankerzone.workers.dev  
**Last Deployed:** October 18, 2024  
**Environment:** Cloudflare Workers + D1 Database

## 🚀 Deployment Process

### Prerequisites
- Node.js (v18+)
- Cloudflare account
- Wrangler CLI installed globally or locally

### Step-by-Step Deployment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Deploy Application**
   ```bash
   npm run deploy
   ```

4. **Apply Database Schema (Production)**
   ```bash
   wrangler d1 execute pindahan-db --file=./worker/schema.sql --remote
   ```

### Development Deployment

For development/testing deployments:

```bash
# Deploy to preview environment
wrangler deploy --env preview

# Apply schema to preview database
wrangler d1 execute pindahan-db-preview --file=./worker/schema.sql --remote
```

## 🧪 Testing Checklist

### ✅ Core Functionality Tests

#### 1. Box Creation
- [ ] Create new box with label and items
- [ ] Verify 4-character unique ID generation
- [ ] Confirm URL generation for sharing

#### 2. Box Retrieval
- [ ] Access box using generated ID via URL hash
- [ ] Verify all items display correctly
- [ ] Check box metadata (label, creation date)

#### 3. Item Management
- [ ] Add new items to existing box
- [ ] Edit existing items
- [ ] Delete items with confirmation
- [ ] Toggle item checked/unchecked status

### ✅ New Search Feature Tests

#### 4. Real-time Search
- [ ] Type in search box - items should filter immediately
- [ ] Search is case-insensitive
- [ ] Matching text is highlighted in yellow
- [ ] "No results" message appears when no matches

#### 5. Search Scenarios
- [ ] Search for partial matches (e.g., "key" finds "keyboard")
- [ ] Search with special characters
- [ ] Search with empty string shows all items
- [ ] Search maintains item functionality (edit/delete/check)

### ✅ User Interface Tests

#### 6. Responsive Design
- [ ] Mobile view (320px+)
- [ ] Tablet view (768px+)
- [ ] Desktop view (1024px+)

#### 7. Navigation
- [ ] Switch between input and detail modes
- [ ] URL hash navigation works correctly
- [ ] Back button functionality

## 🔧 Configuration

### Wrangler Configuration (`wrangler.toml`)

```toml
[env.dev]
d1_databases = [
  { binding = "DB", database_name = "pindahan-db-local", database_id = "a904372d-57d5-4d32-94b6-0e2efd342d9d" }
]

[env.preview]
d1_databases = [
  { binding = "DB", database_name = "pindahan-db-preview", database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
]

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "pindahan-db"
database_id = "c53540a4-17a0-49fd-9fc7-21dcd9e0f4d5"
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS boxes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boxes_id ON boxes(id);
```

## 🐛 Troubleshooting

### Common Issues

1. **Port 8787 Already in Use**
   ```bash
   # Find processes using port
   lsof -ti:8787
   
   # Kill processes
   kill -9 $(lsof -ti:8787)
   ```

2. **Database Connection Errors**
   ```bash
   # Recreate local database
   wrangler d1 create pindahan-db-local
   wrangler d1 execute pindahan-db-local --file=./worker/schema.sql
   ```

3. **Static Assets Not Loading**
   - Check `wrangler.toml` site configuration
   - Verify asset paths in frontend files

### Debug Commands

```bash
# Check deployment status
wrangler whoami
wrangler deployments list

# Database operations
wrangler d1 list
wrangler d1 info pindahan-db

# View logs
wrangler tail
```

## 📊 Performance Metrics

- **Initial Load Time:** < 2 seconds
- **API Response Time:** < 100ms
- **Search Filtering:** Real-time (< 50ms)
- **Database Operations:** < 10ms

## 🔄 Rollback Procedure

If deployment fails:

1. **Redeploy previous version:**
   ```bash
   wrangler deployments rollback --version-id <previous-version-id>
   ```

2. **Database rollback:**
   - Manual backup/restore via D1 dashboard
   - Or redeploy previous database schema

## 📞 Support

- **Documentation:** [README.md](./README.md)
- **API Docs:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues:** GitHub repository issues

---

**Last Updated:** October 18, 2024  
**Maintainer:** Jankerzone