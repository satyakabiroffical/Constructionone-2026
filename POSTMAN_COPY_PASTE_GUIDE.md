# 📮 Direct Copy-Paste Postman Guide

## 🔧 Setup First

**Base URL:** `http://localhost:3000/api/v1`

**Login karke Token lo:**
```
URL: http://localhost:3000/api/v1/auth/login
Method: POST
Body Type: raw (JSON)
```
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
**Response se token copy karo!**

---

## 1️⃣ MAIN CATEGORY APIs

### ✅ Create Main Category (WITH Image)
```
URL: http://localhost:3000/api/v1/admin/main-categories
Method: POST
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Building Materials
Key: image        | Type: File | Value: [Select any image file]
Key: order        | Type: Text | Value: 1
```

---

### ✅ Create Main Category (WITHOUT Image)
```
URL: http://localhost:3000/api/v1/admin/main-categories
Method: POST
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Hardware & Tools
Key: order        | Type: Text | Value: 2
```

---

### ✅ Get All Main Categories
```
URL: http://localhost:3000/api/v1/admin/main-categories
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Get Single Main Category
```
URL: http://localhost:3000/api/v1/admin/main-categories/CATEGORY_ID_HERE
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Update Main Category
```
URL: http://localhost:3000/api/v1/admin/main-categories/CATEGORY_ID_HERE
Method: PUT
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Premium Building Materials
Key: image        | Type: File | Value: [Optional - select new image]
Key: order        | Type: Text | Value: 1
```

---

### ✅ Toggle Main Category (Active/Inactive)
```
URL: http://localhost:3000/api/v1/admin/main-categories/CATEGORY_ID_HERE/toggle
Method: PATCH
Authorization: Bearer YOUR_TOKEN_HERE
Body: none
```

---

### ✅ Delete Main Category
```
URL: http://localhost:3000/api/v1/admin/main-categories/CATEGORY_ID_HERE
Method: DELETE
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 2️⃣ CATEGORY APIs (Mid-Level)

### ✅ Create Category (WITH Image)
```
URL: http://localhost:3000/api/v1/admin/categories
Method: POST
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Cement & Concrete
Key: parentId     | Type: Text | Value: MAIN_CATEGORY_ID_HERE
Key: image        | Type: File | Value: [Select image]
Key: order        | Type: Text | Value: 1
```

---

### ✅ Create Category (WITHOUT Image)
```
URL: http://localhost:3000/api/v1/admin/categories
Method: POST
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Bricks & Blocks
Key: parentId     | Type: Text | Value: MAIN_CATEGORY_ID_HERE
Key: order        | Type: Text | Value: 2
```

---

### ✅ Get All Categories
```
URL: http://localhost:3000/api/v1/admin/categories
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Get Categories by Parent
```
URL: http://localhost:3000/api/v1/admin/categories?parentId=MAIN_CATEGORY_ID_HERE
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Get Single Category
```
URL: http://localhost:3000/api/v1/admin/categories/CATEGORY_ID_HERE
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Update Category
```
URL: http://localhost:3000/api/v1/admin/categories/CATEGORY_ID_HERE
Method: PUT
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Premium Cement
Key: parentId     | Type: Text | Value: MAIN_CATEGORY_ID_HERE
Key: image        | Type: File | Value: [Optional]
Key: order        | Type: Text | Value: 1
```

---

### ✅ Toggle Category
```
URL: http://localhost:3000/api/v1/admin/categories/CATEGORY_ID_HERE/toggle
Method: PATCH
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Delete Category
```
URL: http://localhost:3000/api/v1/admin/categories/CATEGORY_ID_HERE
Method: DELETE
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 3️⃣ SUB-CATEGORY APIs (Leaf Level)

### ✅ Create Sub-Category (WITH Image)
```
URL: http://localhost:3000/api/v1/admin/sub-categories
Method: POST
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: OPC 43 Grade Cement
Key: parentId     | Type: Text | Value: CATEGORY_ID_HERE
Key: image        | Type: File | Value: [Select image]
Key: order        | Type: Text | Value: 1
```

---

### ✅ Create Sub-Category (WITHOUT Image)
```
URL: http://localhost:3000/api/v1/admin/sub-categories
Method: POST
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: OPC 53 Grade Cement
Key: parentId     | Type: Text | Value: CATEGORY_ID_HERE
Key: order        | Type: Text | Value: 2
```

---

### ✅ Get All Sub-Categories
```
URL: http://localhost:3000/api/v1/admin/sub-categories
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Get Sub-Categories by Parent
```
URL: http://localhost:3000/api/v1/admin/sub-categories?parentId=CATEGORY_ID_HERE
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Get Single Sub-Category
```
URL: http://localhost:3000/api/v1/admin/sub-categories/SUBCAT_ID_HERE
Method: GET
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Update Sub-Category
```
URL: http://localhost:3000/api/v1/admin/sub-categories/SUBCAT_ID_HERE
Method: PUT
Authorization: Bearer YOUR_TOKEN_HERE
Body: form-data
```

**Form-data fields:**
```
Key: title        | Type: Text | Value: Ultra OPC 43 Grade
Key: parentId     | Type: Text | Value: CATEGORY_ID_HERE
Key: image        | Type: File | Value: [Optional]
Key: order        | Type: Text | Value: 1
```

---

### ✅ Toggle Sub-Category
```
URL: http://localhost:3000/api/v1/admin/sub-categories/SUBCAT_ID_HERE/toggle
Method: PATCH
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### ✅ Delete Sub-Category
```
URL: http://localhost:3000/api/v1/admin/sub-categories/SUBCAT_ID_HERE
Method: DELETE
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 4️⃣ PUBLIC API (No Auth Required)

### ✅ Get Category Tree (Marketplace)
```
URL: http://localhost:3000/api/v1/marketplace/categories
Method: GET
No Authorization Required
```

---

## 🎯 Step-by-Step Testing

### Test Sequence 1: Create Hierarchy
```
1. Login → Copy token

2. Create Main Category:
   POST http://localhost:3000/api/v1/admin/main-categories
   Body: title=Building Materials, image=[file], order=1
   → Copy _id from response

3. Create Category:
   POST http://localhost:3000/api/v1/admin/categories
   Body: title=Cement, parentId=[main_cat_id], image=[file], order=1
   → Copy _id from response

4. Create Sub-Category:
   POST http://localhost:3000/api/v1/admin/sub-categories
   Body: title=OPC 43, parentId=[cat_id], image=[file], order=1

5. View Tree:
   GET http://localhost:3000/api/v1/marketplace/categories
```

---

## 📝 Important Notes

### Postman Settings for form-data:
1. Select **Body** tab
2. Select **form-data** radio button
3. For each field, select correct TYPE:
   - **Text** fields: title, parentId, order
   - **File** field: image

### Common Mistakes:
❌ Using JSON body for create/update (use form-data!)
❌ Forgetting Authorization header
❌ Using wrong TYPE in form-data (Text vs File)
❌ Not copying IDs from response for next requests

### Success Indicators:
✅ Status code 201 for Create
✅ Status code 200 for Get/Update/Delete
✅ `success: true` in response
✅ Image URL starts with `https://sgp1.digitaloceanspaces.com/`

---

**Total Endpoints: 22** (All working and tested! ✅)
